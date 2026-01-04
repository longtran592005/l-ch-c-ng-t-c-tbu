BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[meeting_records] (
    [id] NVARCHAR(1000) NOT NULL,
    [schedule_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(500) NOT NULL,
    [meeting_date] DATE NOT NULL,
    [start_time] TIME,
    [end_time] TIME,
    [location] NVARCHAR(500),
    [leader] NVARCHAR(255),
    [participants] NTEXT NOT NULL CONSTRAINT [meeting_records_participants_df] DEFAULT '[]',
    [audio_recordings] NTEXT NOT NULL CONSTRAINT [meeting_records_audio_recordings_df] DEFAULT '[]',
    [content] NTEXT,
    [minutes] NTEXT,
    [created_by] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [meeting_records_status_df] DEFAULT 'draft',
    [notes] NTEXT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [meeting_records_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [completed_at] DATETIME2,
    CONSTRAINT [meeting_records_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [meeting_records_schedule_id_idx] ON [dbo].[meeting_records]([schedule_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [meeting_records_meeting_date_idx] ON [dbo].[meeting_records]([meeting_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [meeting_records_created_by_idx] ON [dbo].[meeting_records]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [meeting_records_status_idx] ON [dbo].[meeting_records]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[meeting_records] ADD CONSTRAINT [meeting_records_schedule_id_fkey] FOREIGN KEY ([schedule_id]) REFERENCES [dbo].[schedules]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[meeting_records] ADD CONSTRAINT [meeting_records_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH

