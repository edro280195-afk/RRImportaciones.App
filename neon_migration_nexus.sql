START TRANSACTION;
ALTER TABLE "AuditoriaLogs" ALTER COLUMN "IpAddress" TYPE text;

ALTER TABLE "AuditoriaLogs" ALTER COLUMN "EntidadId" TYPE text;

ALTER TABLE "AuditoriaLogs" ALTER COLUMN "Entidad" TYPE text;

ALTER TABLE "AuditoriaLogs" ALTER COLUMN "Accion" TYPE text;

CREATE TABLE "ConversacionesNexus" (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Titulo" character varying(250),
    "Resumen" text,
    "FechaCreacion" timestamp with time zone NOT NULL,
    "FechaUltimaActividad" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ConversacionesNexus" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ConversacionesNexus_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ConversacionesNexus_Usuarios_UserId" FOREIGN KEY ("UserId") REFERENCES "Usuarios" ("Id") ON DELETE CASCADE
);

CREATE TABLE "MensajesNexus" (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "ConversacionId" uuid NOT NULL,
    "Role" character varying(20) NOT NULL,
    "Texto" text NOT NULL,
    "ImagenMime" character varying(100),
    "TieneImagen" boolean NOT NULL,
    "ToolCallsJson" jsonb,
    "Fecha" timestamp with time zone NOT NULL,
    "Orden" integer NOT NULL,
    CONSTRAINT "PK_MensajesNexus" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_MensajesNexus_ConversacionesNexus_ConversacionId" FOREIGN KEY ("ConversacionId") REFERENCES "ConversacionesNexus" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_MensajesNexus_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_ConversacionesNexus_TenantId_UserId" ON "ConversacionesNexus" ("TenantId", "UserId");

CREATE INDEX "IX_ConversacionesNexus_UserId" ON "ConversacionesNexus" ("UserId");

CREATE INDEX "IX_MensajesNexus_ConversacionId" ON "MensajesNexus" ("ConversacionId");

CREATE INDEX "IX_MensajesNexus_TenantId_ConversacionId" ON "MensajesNexus" ("TenantId", "ConversacionId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260526165602_AddNexusHistoryAndConversations', '10.0.7');

COMMIT;

