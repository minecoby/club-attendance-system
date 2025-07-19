from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_leader = Column(Boolean, default=False)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    token = Column(Text, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    club_name = Column(String, nullable=False)
    club_code = Column(String, unique=True, nullable=False)
    members = relationship("StuClub", back_populates="club")


class StuClub(Base):
    __tablename__ = "stuclubs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)  
    club_code = Column(String, ForeignKey("clubs.club_code"), nullable=False)  

    user = relationship("User")
    club = relationship("Club", back_populates="members")


class AttendanceDate(Base):
    __tablename__ = "attendance_dates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    club_code = Column(String, ForeignKey("clubs.club_code"), nullable=False)  
    date = Column(Date, nullable=False)
    set_by = Column(String, ForeignKey("users.user_id"), nullable=False)  

    attendances = relationship("Attendance", back_populates="attendance_date")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)  
    attendance_date_id = Column(Integer, ForeignKey("attendance_dates.id"), nullable=False)  
    status = Column(Boolean, nullable=False, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    attendance_date = relationship("AttendanceDate", back_populates="attendances")
    user = relationship("User")
