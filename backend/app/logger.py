import logging
import os
from logging.handlers import RotatingFileHandler

def setup_loggers():
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    loggers_config = {
        'auth': 'auth.log',          # 로그인, 로그아웃, 토큰 관련
        'attendance': 'attendance.log', # 출석 관련
        'admin': 'admin.log',        # 관리자 기능
        'club': 'club.log',          # 동아리 관련
        'api': 'api_requests.log'    # 전체 API 요청
    }
    
    for logger_name, log_file in loggers_config.items():
        logger = logging.getLogger(f"hanssup.{logger_name}")
        logger.setLevel(logging.INFO)
        
        if logger.handlers:
            continue
            
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, log_file),
            maxBytes=5*1024*1024,  
            backupCount=3,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

def get_auth_logger():
    return logging.getLogger("hanssup.auth")

def get_attendance_logger():
    return logging.getLogger("hanssup.attendance")

def get_admin_logger():
    return logging.getLogger("hanssup.admin")

def get_club_logger():
    return logging.getLogger("hanssup.club")

def get_api_logger():
    return logging.getLogger("hanssup.api")