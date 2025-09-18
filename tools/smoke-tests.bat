@echo off
REM set CP_JWT before running if you want to test auth flows:
REM set CP_JWT=eyJ...yourtoken...

echo === Auth login test ===
curl -X POST "http://localhost:4000/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"fresh-emp1@demo.com\",\"password\":\"Test1234\"}"
echo.
echo === Wallet GET (with token) ===
curl -H "Authorization: Bearer %CP_JWT%" "http://localhost:4000/api/wallet"
echo.
echo === Create notification (admin) ===
curl -X POST "http://localhost:4000/api/notifications/admin/create" -H "Content-Type: application/json" -H "x-admin-key: very-simple-admin-key" -d "{\"ownerId\":\"68c05688027d7903bda9d4b1\",\"ownerType\":\"worker\",\"title\":\"smoke test\",\"message\":\"hello\"}"
echo.
echo === Wallet credit (admin) ===
curl -X POST "http://localhost:4000/api/wallet/credit" -H "Content-Type: application/json" -H "Authorization: Bearer %CP_JWT%" -d "{\"ownerId\":\"68c05688027d7903bda9d4b1\",\"amount\":5,\"currency\":\"USD\",\"source\":\"smoke\"}"
echo.
