from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(255), primary_key=True)
    gmail = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(100), nullable=False)
    is_leader = Column(Boolean, default=False)
    google_refresh_token = Column(Text, nullable=True)  


class ConsentAgreement(Base):
    __tablename__ = "consent_agreements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False)
    agreed_to_terms = Column(Boolean, nullable=False, default=False)
    agreed_to_privacy = Column(Boolean, nullable=False, default=False)
    consent_version = Column(String(50), nullable=False)
    agreed_ip = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    agreed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False)
    token = Column(String(512), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    club_name = Column(String(100), nullable=False)
    club_code = Column(String(20), unique=True, nullable=False)
    location_enabled = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_km = Column(Float, default=0.1)
    members = relationship("StuClub", back_populates="club")


class StuClub(Base):
    __tablename__ = "stuclubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False)
    club_code = Column(String(20), ForeignKey("clubs.club_code"), nullable=False)

    user = relationship("User")
    club = relationship("Club", back_populates="members")


class AttendanceDate(Base):
    __tablename__ = "attendance_dates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    club_code = Column(String(20), ForeignKey("clubs.club_code"), nullable=False)
    date = Column(Date, nullable=False)
    set_by = Column(String(255), ForeignKey("users.user_id"), nullable=False)

    attendances = relationship("Attendance", back_populates="attendance_date")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), ForeignKey("users.user_id"), nullable=False)
    attendance_date_id = Column(Integer, ForeignKey("attendance_dates.id"), nullable=False)
    status = Column(Boolean, nullable=False, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    attendance_date = relationship("AttendanceDate", back_populates="attendances")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint('user_id', 'attendance_date_id', name='unique_user_attendance_date'),
    )
