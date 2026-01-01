BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [password_hash] NVARCHAR(255) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'viewer',
    [department] NVARCHAR(255),
    [position] NVARCHAR(255),
    [phone] NVARCHAR(20),
    [avatar] NTEXT,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'active',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [last_login_at] DATETIME2,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[schedules] (
    [id] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [day_of_week] NVARCHAR(20) NOT NULL,
    [start_time] TIME NOT NULL,
    [end_time] TIME NOT NULL,
    [content] NTEXT NOT NULL,
    [location] NVARCHAR(500) NOT NULL,
    [leader] NVARCHAR(255) NOT NULL,
    [participants] NTEXT NOT NULL CONSTRAINT [schedules_participants_df] DEFAULT '[]',
    [preparing_unit] NVARCHAR(255) NOT NULL,
    [cooperating_units] NTEXT CONSTRAINT [schedules_cooperating_units_df] DEFAULT '[]',
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [schedules_status_df] DEFAULT 'draft',
    [notes] NTEXT,
    [created_by] NVARCHAR(1000) NOT NULL,
    [approved_by] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [schedules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [approved_at] DATETIME2,
    CONSTRAINT [schedules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[schedule_approvals] (
    [id] NVARCHAR(1000) NOT NULL,
    [schedule_id] NVARCHAR(1000) NOT NULL,
    [approved_by] NVARCHAR(1000) NOT NULL,
    [approved_at] DATETIME2 NOT NULL CONSTRAINT [schedule_approvals_approved_at_df] DEFAULT CURRENT_TIMESTAMP,
    [previous_status] NVARCHAR(20),
    [new_status] NVARCHAR(20) NOT NULL,
    [notes] NTEXT,
    CONSTRAINT [schedule_approvals_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[news] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(500) NOT NULL,
    [summary] NTEXT,
    [content] NTEXT NOT NULL,
    [image] NTEXT,
    [category] NVARCHAR(20) NOT NULL,
    [author_id] NVARCHAR(1000),
    [author_name] NVARCHAR(255),
    [views] INT NOT NULL CONSTRAINT [news_views_df] DEFAULT 0,
    [published_at] DATETIME2 NOT NULL CONSTRAINT [news_published_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [news_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [news_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[announcements] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(500) NOT NULL,
    [content] NTEXT NOT NULL,
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [announcements_priority_df] DEFAULT 'normal',
    [published_at] DATETIME2 NOT NULL CONSTRAINT [announcements_published_at_df] DEFAULT CURRENT_TIMESTAMP,
    [expires_at] DATETIME2,
    [attachments] NTEXT NOT NULL CONSTRAINT [announcements_attachments_df] DEFAULT '[]',
    [created_by] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [announcements_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [announcements_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [message] NTEXT NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [linked_type] NVARCHAR(50),
    [linked_id] UNIQUEIDENTIFIER,
    [read] BIT NOT NULL CONSTRAINT [notifications_read_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[refresh_tokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(500) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [revoked] BIT NOT NULL CONSTRAINT [refresh_tokens_revoked_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [refresh_tokens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [revoked_at] DATETIME2,
    CONSTRAINT [refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [refresh_tokens_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_email_idx] ON [dbo].[users]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_role_idx] ON [dbo].[users]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_status_idx] ON [dbo].[users]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedules_date_idx] ON [dbo].[schedules]([date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedules_status_idx] ON [dbo].[schedules]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedules_leader_idx] ON [dbo].[schedules]([leader]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedules_created_by_idx] ON [dbo].[schedules]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedules_date_status_idx] ON [dbo].[schedules]([date], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedule_approvals_schedule_id_idx] ON [dbo].[schedule_approvals]([schedule_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [schedule_approvals_approved_by_idx] ON [dbo].[schedule_approvals]([approved_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [news_category_idx] ON [dbo].[news]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [news_published_at_idx] ON [dbo].[news]([published_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [announcements_priority_idx] ON [dbo].[announcements]([priority]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [announcements_published_at_idx] ON [dbo].[announcements]([published_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [announcements_expires_at_idx] ON [dbo].[announcements]([expires_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_idx] ON [dbo].[notifications]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_read_idx] ON [dbo].[notifications]([user_id], [read]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_created_at_idx] ON [dbo].[notifications]([created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [refresh_tokens_user_id_idx] ON [dbo].[refresh_tokens]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [refresh_tokens_token_idx] ON [dbo].[refresh_tokens]([token]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [refresh_tokens_expires_at_idx] ON [dbo].[refresh_tokens]([expires_at]);

-- AddForeignKey
ALTER TABLE [dbo].[schedules] ADD CONSTRAINT [schedules_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[schedules] ADD CONSTRAINT [schedules_approved_by_fkey] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[schedule_approvals] ADD CONSTRAINT [schedule_approvals_schedule_id_fkey] FOREIGN KEY ([schedule_id]) REFERENCES [dbo].[schedules]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[schedule_approvals] ADD CONSTRAINT [schedule_approvals_approved_by_fkey] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[news] ADD CONSTRAINT [news_author_id_fkey] FOREIGN KEY ([author_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[announcements] ADD CONSTRAINT [announcements_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_tokens] ADD CONSTRAINT [refresh_tokens_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
