-- Tạo login
CREATE LOGIN prisma_user
WITH PASSWORD = 'StrongPassword123!',
CHECK_POLICY = OFF;
GO
USE tbu_schedule_db;
GO

CREATE USER prisma_user FOR LOGIN prisma_user;
GO

ALTER ROLE db_owner ADD MEMBER prisma_user;
GO
EXECUTE AS LOGIN = 'prisma_user';
SELECT USER_NAME();
REVERT;
SELECT SERVERPROPERTY('IsIntegratedSecurityOnly');

ALTER SERVER ROLE sysadmin ADD MEMBER prisma_user;
GO

