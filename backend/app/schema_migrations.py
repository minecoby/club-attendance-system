from sqlalchemy import text


async def ensure_attendance_season_schema(conn):
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS attendance_season_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            season_id INT NOT NULL,
            club_code VARCHAR(20) COLLATE utf8mb4_bin NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_attendance_season_member (season_id, user_id),
            INDEX ix_attendance_season_members_season_id (season_id),
            INDEX ix_attendance_season_members_club_code (club_code),
            CONSTRAINT fk_attendance_season_members_season
                FOREIGN KEY (season_id) REFERENCES attendance_seasons(id),
            CONSTRAINT fk_attendance_season_members_club
                FOREIGN KEY (club_code) REFERENCES clubs(club_code),
            CONSTRAINT fk_attendance_season_members_user
                FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """))

    result = await conn.execute(text("""
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'attendance_dates'
          AND COLUMN_NAME = 'season_id'
    """))
    has_season_id = result.scalar() > 0

    if not has_season_id:
        await conn.execute(text("ALTER TABLE attendance_dates ADD COLUMN season_id INT NULL"))
        await conn.execute(text("CREATE INDEX ix_attendance_dates_season_id ON attendance_dates (season_id)"))

    await conn.execute(text("""
        INSERT INTO attendance_seasons (club_code, name, is_active, created_at)
        SELECT c.club_code, '현재 시즌', 1, NOW()
        FROM clubs c
        WHERE NOT EXISTS (
            SELECT 1
            FROM attendance_seasons s
            WHERE s.club_code = c.club_code
        )
    """))

    await conn.execute(text("""
        UPDATE attendance_dates ad
        JOIN attendance_seasons s
          ON s.club_code = ad.club_code
         AND s.is_active = 1
        SET ad.season_id = s.id
        WHERE ad.season_id IS NULL
    """))
