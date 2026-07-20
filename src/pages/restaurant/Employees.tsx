import React, { useEffect, useState } from "react";
import { Plus, Edit, KeyRound, UserX, UserCheck, Users } from "lucide-react";
import { Card, Button, Input, Badge, Modal, Loading, Alert } from "../../components/ui";
import {
  subscribeToEmployees,
  createEmployee,
  updateEmployee,
  resetEmployeePin,
  deactivateEmployee,
  reactivateEmployee,
} from "../../services/employeeService";
import type { Employee, EmployeeRole } from "../../config/supabase";

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: "caja", label: "Caja" },
  { value: "cocina", label: "Cocina" },
  { value: "mesero", label: "Mesero" },
];

const isValidPin = (pin: string) => /^\d{4}$/.test(pin);

const Employees: React.FC = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formName, setFormName] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRoles, setFormRoles] = useState<EmployeeRole[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;
    setRestaurantId(user.restaurant_id);

    const subscription = subscribeToEmployees(user.restaurant_id, (data) => {
      setEmployees(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormPin("");
    setFormRoles([]);
    setFormError("");
  };

  const toggleRole = (role: EmployeeRole) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormName(employee.name);
    setFormRoles(employee.roles);
    setFormError("");
    setShowEditModal(true);
  };

  const handleOpenResetPin = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormPin("");
    setFormError("");
    setShowPinModal(true);
  };

  const friendlyError = (error: any) => {
    if (error?.code === "23505") {
      return "Ese PIN ya lo usa otro empleado activo de este restaurante. Elige otro.";
    }
    return "Ocurrió un error. Intenta de nuevo.";
  };

  const handleCreate = async () => {
    if (!restaurantId) return;
    if (!formName.trim()) return setFormError("Ingresa un nombre");
    if (!isValidPin(formPin)) return setFormError("El PIN debe tener 4 dígitos");
    if (formRoles.length === 0) return setFormError("Selecciona al menos un rol");

    setSaving(true);
    const { error } = await createEmployee(restaurantId, formName.trim(), formPin, formRoles);
    setSaving(false);

    if (error) return setFormError(friendlyError(error));
    setShowAddModal(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedEmployee) return;
    if (!formName.trim()) return setFormError("Ingresa un nombre");
    if (formRoles.length === 0) return setFormError("Selecciona al menos un rol");

    setSaving(true);
    const { error } = await updateEmployee(selectedEmployee.id, {
      name: formName.trim(),
      roles: formRoles,
    });
    setSaving(false);

    if (error) return setFormError(friendlyError(error));
    setShowEditModal(false);
    resetForm();
    setSelectedEmployee(null);
  };

  const handleResetPin = async () => {
    if (!selectedEmployee) return;
    if (!isValidPin(formPin)) return setFormError("El PIN debe tener 4 dígitos");

    setSaving(true);
    const { error } = await resetEmployeePin(selectedEmployee.id, formPin);
    setSaving(false);

    if (error) return setFormError(friendlyError(error));
    setShowPinModal(false);
    resetForm();
    setSelectedEmployee(null);
  };

  const handleToggleActive = async (employee: Employee) => {
    if (employee.is_active) {
      await deactivateEmployee(employee.id);
    } else {
      await reactivateEmployee(employee.id);
    }
  };

  if (loading) {
    return <Loading text="Cargando empleados..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Empleados</h2>
          <p className="text-text-secondary">
            Administra el personal, sus roles y PIN de acceso
          </p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={handleOpenAdd}>
          Nuevo Empleado
        </Button>
      </div>

      {/* Employee List */}
      {employees.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">Sin empleados aún</h3>
          <p className="text-text-secondary mb-4">
            Crea el primer empleado para que pueda iniciar turno con su PIN en Comandas
          </p>
          <Button icon={<Plus className="w-5 h-5" />} onClick={handleOpenAdd}>
            Crear Primer Empleado
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {employees.map((employee) => (
            <Card
              key={employee.id}
              className={`hover:shadow-lg transition-shadow ${
                !employee.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-text">{employee.name}</h3>
                    {employee.roles.map((role) => (
                      <Badge key={role} variant="accent-secondary">
                        {ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role}
                      </Badge>
                    ))}
                    {!employee.is_active && <Badge variant="neutral">Inactivo</Badge>}
                  </div>
                  <div className="text-sm">
                    <span className="text-text-secondary">PIN: </span>
                    <span className="text-text font-mono tracking-widest">{employee.pin}</span>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 lg:min-w-[180px]">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Edit className="w-4 h-4" />}
                    onClick={() => handleOpenEdit(employee)}
                    fullWidth
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<KeyRound className="w-4 h-4" />}
                    onClick={() => handleOpenResetPin(employee)}
                    fullWidth
                  >
                    Resetear PIN
                  </Button>
                  <Button
                    size="sm"
                    variant={employee.is_active ? "danger" : "primary"}
                    icon={
                      employee.is_active ? (
                        <UserX className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )
                    }
                    onClick={() => handleToggleActive(employee)}
                    fullWidth
                  >
                    {employee.is_active ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nuevo Empleado"
      >
        <div className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input
            label="Nombre"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nombre del empleado"
          />
          <Input
            label="PIN (4 dígitos)"
            value={formPin}
            onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
          />
          <div>
            <label className="label">Roles</label>
            <div className="flex gap-3 flex-wrap">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-text text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button fullWidth loading={saving} onClick={handleCreate}>
            Crear Empleado
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Empleado"
      >
        <div className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input
            label="Nombre"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <div>
            <label className="label">Roles</label>
            <div className="flex gap-3 flex-wrap">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-text text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button fullWidth loading={saving} onClick={handleUpdate}>
            Guardar Cambios
          </Button>
        </div>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        title="Resetear PIN"
      >
        <div className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input
            label="Nuevo PIN (4 dígitos)"
            value={formPin}
            onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
          />
          <Button fullWidth loading={saving} onClick={handleResetPin}>
            Guardar Nuevo PIN
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Employees;
