#!/bin/bash
# Crea el usuario de desarrollo y le asigna Super Admin
# Ejecutar después de cada `supabase db reset`
# Uso: bash supabase/scripts/seed-auth.sh

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
API_URL="http://127.0.0.1:54321"
DEV_EMAIL="nicolas@vitalisuites.com"
DEV_PASSWORD="dev1234"

echo "Creando usuario de desarrollo..."

RESPONSE=$(curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEV_EMAIL\",\"password\":\"$DEV_PASSWORD\",\"email_confirm\":true}")

USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "Error creando usuario: $RESPONSE"
  exit 1
fi

echo "Usuario creado: $USER_ID"
echo "Asignando rol Super Admin..."

supabase db query "
  INSERT INTO user_profiles (user_id, full_name)
  VALUES ('$USER_ID', 'Nicolás Dev')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_roles (user_id, role_id)
  VALUES ('$USER_ID', (SELECT id FROM roles WHERE name = 'Super Admin'))
  ON CONFLICT DO NOTHING;
" 2>&1

echo "Listo. Login: $DEV_EMAIL / $DEV_PASSWORD"
