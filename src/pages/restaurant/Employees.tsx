import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  DollarSign,
  Clock,
  Briefcase,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
} from "../../components/ui";
import {
  subscribeToRestaurantEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getEmployeeStats,
} from "../../services/employeeService";
import type { Employee, EmployeeRole } from "../../config/supabase";

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) return;

    const subscription = subscribeToRestaurantEmployees(user.restaurant_id, (data) => {
      setEmployees(data);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && employee.is_active) ||
      (filterStatus === "inactive" && !employee.is_active);
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const handleToggleStatus = async (employee: Employee) => {
    await toggleEmployeeStatus(employee.id, !employee.is_active);
  };

  const stats = getEmployeeStats(employees);

  if (loading) {
    return <Loading text="Cargando empleados..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Gestión de Empleados</h2>
          <p className="text-text-secondary">
            Administra tu equipo y calcula costos laborales reales
          </p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowAddModal(true)}
        >
          Agregar Empleado
        </Button>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center space-x-2 text-sm text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
        <span>Actualizaciones en vivo • Los cambios se reflejan al instante</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Total Empleados</p>
              <p className="text-2xl font-bold text-text">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-accent opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Activos</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
            <Briefcase className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Costo Laboral Mensual</p>
              <p className="text-2xl font-bold text-warning">
                ${stats.monthlyLaborCost.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-warning opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Tiempo Completo</p>
              <p className="text-2xl font-bold text-accent">{stats.fullTime}</p>
              <p className="text-xs text-text-secondary mt-1">
                {stats.partTime} PT • {stats.hourly} Por hora
              </p>
            </div>
            <Clock className="w-8 h-8 text-accent opacity-50" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar empleados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all", label: "Todos" },
            { value: "active", label: "Activos" },
            { value: "inactive", label: "Inactivos" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterStatus === filter.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface border border-border text-text-secondary hover:bg-bg-subtle"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-text mb-2">
            No Se Encontraron Empleados
          </h3>
          <p className="text-text-secondary mb-4">
            {searchTerm || filterStatus !== "all"
              ? "Intenta ajustar tus filtros"
              : "Comienza agregando tu primer empleado"}
          </p>
          <Button
            icon={<Plus className="w-5 h-5" />}
            onClick={() => setShowAddModal(true)}
          >
            Agregar Primer Empleado
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((employee) => {
            return (
              <Card
                key={employee.id}
                className={`p-5 hover:shadow-lg transition-all duration-200 ${
                  !employee.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-text truncate mb-2">
                      {employee.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {employee.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="neutral">Inactivo</Badge>
                      )}
                      <Badge variant="info">
                        {employee.employment_type === "full_time"
                          ? "Tiempo Completo"
                          : employee.employment_type === "part_time"
                          ? "Medio Tiempo"
                          : "Por Hora"}
                      </Badge>
                    </div>
                    {employee.position && (
                      <p className="text-sm text-text-secondary">{employee.position}</p>
                    )}
                  </div>
                  <Users className="w-8 h-8 text-text-secondary opacity-30 flex-shrink-0 ml-2" />
                </div>

                {/* Compensation Display */}
                <div className="mb-4">
                  <div className="text-center py-4 bg-bg-subtle rounded-lg">
                    {employee.employment_type === "full_time" && (
                      <>
                        <p className="text-2xl font-bold text-accent">
                          ${employee.monthly_salary?.toLocaleString("es-MX")}
                        </p>
                        <p className="text-sm text-text-secondary mt-1">mensual</p>
                      </>
                    )}
                    {employee.employment_type === "part_time" && (
                      <>
                        <p className="text-2xl font-bold text-accent">
                          ${employee.hourly_rate?.toLocaleString("es-MX")}/hr
                        </p>
                        <p className="text-sm text-text-secondary mt-1">
                          {employee.hours_per_week} hrs/semana
                        </p>
                      </>
                    )}
                    {employee.employment_type === "hourly" && (
                      <>
                        <p className="text-2xl font-bold text-accent">
                          ${employee.hourly_rate?.toLocaleString("es-MX")}/hr
                        </p>
                        <p className="text-sm text-text-secondary mt-1">por hora</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {employee.notes && (
                  <div className="mb-4">
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {employee.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-border text-text-secondary hover:text-error hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(employee)}
                    className="w-full px-3 py-2 bg-surface border border-border text-text-secondary hover:text-text hover:bg-bg-subtle rounded-lg text-sm font-medium transition-colors"
                  >
                    {employee.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <EmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
      />

      <EmployeeModal
        isOpen={showEditModal}
        employee={selectedEmployee}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
        }}
        mode="edit"
      />

      <DeleteModal
        isOpen={showDeleteModal}
        employee={selectedEmployee}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedEmployee(null);
        }}
      />
    </div>
  );
};

// Employee Modal (Add/Edit)
interface EmployeeModalProps {
  isOpen: boolean;
  employee?: Employee | null;
  onClose: () => void;
  mode: "add" | "edit";
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  employee,
  onClose,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    employment_type: "full_time" as "full_time" | "part_time" | "hourly",
    monthly_salary: "",
    hourly_rate: "",
    hours_per_week: "",
    notes: "",
    pin: "",
    roles: [] as EmployeeRole[],
    is_active: true,
  });

  useEffect(() => {
    if (mode === "edit" && employee) {
      setFormData({
        name: employee.name,
        position: employee.position || "",
        employment_type: employee.employment_type,
        monthly_salary: employee.monthly_salary?.toString() || "",
        hourly_rate: employee.hourly_rate?.toString() || "",
        hours_per_week: employee.hours_per_week?.toString() || "",
        notes: employee.notes || "",
        pin: employee.pin || "",
        roles: employee.roles || [],
        is_active: employee.is_active,
      });
    } else {
      setFormData({
        name: "",
        position: "",
        employment_type: "full_time",
        monthly_salary: "",
        hourly_rate: "",
        hours_per_week: "",
        notes: "",
        pin: "",
        roles: [],
        is_active: true,
      });
    }
  }, [mode, employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name) {
      setError("El nombre es obligatorio");
      return;
    }

    // Validar campos según tipo de empleo
    if (formData.employment_type === "full_time" && !formData.monthly_salary) {
      setError("El salario mensual es obligatorio para empleados de tiempo completo");
      return;
    }

    if (
      (formData.employment_type === "part_time" || formData.employment_type === "hourly") &&
      !formData.hourly_rate
    ) {
      setError("La tarifa por hora es obligatoria");
      return;
    }

    if (formData.employment_type === "part_time" && !formData.hours_per_week) {
      setError("Las horas semanales son obligatorias para empleados de medio tiempo");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.restaurant_id) {
      setError("No se encontró el ID del restaurante");
      return;
    }

    setLoading(true);

    try {
      const employeeData: Partial<Employee> = {
        restaurant_id: user.restaurant_id,
        name: formData.name.trim(),
        position: formData.position || undefined,
        employment_type: formData.employment_type,
        monthly_salary:
          formData.employment_type === "full_time" && formData.monthly_salary
            ? parseFloat(formData.monthly_salary)
            : undefined,
        hourly_rate:
          formData.employment_type !== "full_time" && formData.hourly_rate
            ? parseFloat(formData.hourly_rate)
            : undefined,
        hours_per_week:
          formData.employment_type === "part_time" && formData.hours_per_week
            ? parseFloat(formData.hours_per_week)
            : undefined,
        notes: formData.notes || undefined,
        pin: formData.pin || undefined,
        roles: formData.roles,
        is_active: formData.is_active,
      };

      let success = false;
      if (mode === "add") {
        success = await createEmployee(employeeData);
      } else if (employee) {
        success = await updateEmployee(employee.id, employeeData);
      }

      setLoading(false);

      if (success) {
        onClose();
      } else {
        setError(
          mode === "add"
            ? "No se pudo agregar el empleado"
            : "No se pudo actualizar el empleado"
        );
      }
    } catch (err: any) {
      setLoading(false);
      setError(
        mode === "add"
          ? "Error al agregar el empleado. Intenta de nuevo."
          : "Error al actualizar el empleado. Intenta de nuevo."
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Agregar Empleado" : "Editar Empleado"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <Input
          label="Nombre Completo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Juan Pérez"
          required
        />

        <Input
          label="Puesto (Opcional)"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          placeholder="Chef, Mesero, Cajero, etc."
        />

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Tipo de Empleo
          </label>
          <select
            value={formData.employment_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                employment_type: e.target.value as any,
                monthly_salary: "",
                hourly_rate: "",
                hours_per_week: "",
              })
            }
            className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="full_time">Tiempo Completo (Salario Mensual)</option>
            <option value="part_time">Medio Tiempo (Por Hora + Horas/Semana)</option>
            <option value="hourly">Por Hora</option>
          </select>
        </div>

        {formData.employment_type === "full_time" && (
          <Input
            label="Salario Mensual"
            type="number"
            min="0"
            step="0.01"
            value={formData.monthly_salary}
            onChange={(e) =>
              setFormData({ ...formData, monthly_salary: e.target.value })
            }
            placeholder="15000"
            required
          />
        )}

        {formData.employment_type !== "full_time" && (
          <Input
            label="Tarifa por Hora"
            type="number"
            min="0"
            step="0.01"
            value={formData.hourly_rate}
            onChange={(e) =>
              setFormData({ ...formData, hourly_rate: e.target.value })
            }
            placeholder="100"
            required
          />
        )}

        {formData.employment_type === "part_time" && (
          <Input
            label="Horas por Semana"
            type="number"
            min="0"
            step="0.5"
            value={formData.hours_per_week}
            onChange={(e) =>
              setFormData({ ...formData, hours_per_week: e.target.value })
            }
            placeholder="20"
            required
          />
        )}

        <Input
          label="PIN (Opcional - 4 dígitos para Comandas)"
          type="text"
          maxLength={4}
          value={formData.pin}
          onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder="1234"
        />

        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Roles para Comandas (Opcional)
          </label>
          <div className="flex gap-3 flex-wrap">
            {(["caja", "cocina", "mesero"] as EmployeeRole[]).map((role) => (
              <label
                key={role}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-bg-subtle"
              >
                <input
                  type="checkbox"
                  checked={formData.roles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, roles: [...formData.roles, role] });
                    } else {
                      setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-text text-sm capitalize">{role}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Los roles permiten al empleado acceder a diferentes áreas en Comandas
          </p>
        </div>

        <Input
          label="Notas (Opcional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Información adicional"
        />

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="rounded border-border"
          />
          <span className="text-text">Empleado Activo</span>
        </label>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} fullWidth>
            {mode === "add" ? "Agregar Empleado" : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Delete Modal
interface DeleteModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, employee, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!employee) return;

    setLoading(true);
    const success = await deleteEmployee(employee.id);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Empleado" size="md">
      <div className="space-y-4">
        <Alert
          type="warning"
          message={`¿Seguro que quieres eliminar a ${employee.name}? Esta acción no se puede deshacer.`}
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            fullWidth
          >
            Eliminar Empleado
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Employees;
