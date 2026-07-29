#!/bin/bash

# ============================================
# Create Admin User Script
# ============================================
# Interactive script to create an admin user
# Usage: ./scripts/create-admin.sh
# ============================================

echo "🔐 Create Admin User for Cocina Cantera POS"
echo "============================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase"
    echo "Run: supabase login"
    exit 1
fi

# Prompt for admin details
read -p "Enter admin email: " ADMIN_EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
read -p "Enter admin name (default: Administrador): " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Administrador}

echo ""
echo "Creating admin user..."

# Create SQL command
SQL_COMMAND="
INSERT INTO admin_users (email, password_hash, name)
VALUES (
  '$ADMIN_EMAIL',
  crypt('$ADMIN_PASSWORD', gen_salt('bf')),
  '$ADMIN_NAME'
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, name, created_at;
"

# Execute via Supabase CLI
supabase db execute --db-url "postgresql://postgres:Lalito123!@db.rphwlsiwwxeqerakevvq.supabase.co:5432/postgres" <<EOF
$SQL_COMMAND
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Admin user created successfully!"
    echo "Email: $ADMIN_EMAIL"
    echo ""
    echo "You can now login at:"
    echo "https://your-domain.vercel.app/admin/login"
else
    echo ""
    echo "❌ Failed to create admin user"
    echo "Check the error above for details"
fi
