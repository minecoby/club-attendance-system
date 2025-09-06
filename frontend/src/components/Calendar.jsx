import { useState, useEffect } from 'react';
import './Calendar.css';

const Calendar = ({ selectedDate, onDateSelect, availableDates = [], language = 'ko' }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    useEffect(() => {
        if (selectedDate) {
            const date = new Date(selectedDate);
            if (!isNaN(date.getTime())) {
                setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            }
        }
    }, [selectedDate]);

    const monthNames = language === 'en' ? 
        ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'] :
        ['1월', '2월', '3월', '4월', '5월', '6월',
         '7월', '8월', '9월', '10월', '11월', '12월'];

    const dayNames = language === 'en' ? 
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] :
        ['일', '월', '화', '수', '목', '금', '토'];

    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    
    const calendarDays = [];
    
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        calendarDays.push({
            day,
            date: new Date(year, month - 1, day),
            isCurrentMonth: false,
            dateStr: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
        });
    }
    
    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        calendarDays.push({
            day,
            date,
            isCurrentMonth: true,
            dateStr
        });
    }
    
    // 다음 달의 첫째 날들 
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const dateStr = year + '-' + String(month + 2).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        calendarDays.push({
            day,
            date,
            isCurrentMonth: false,
            dateStr
        });
    }

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentMonth(new Date());
        onDateSelect(todayStr);
    };

    const handleDateClick = (dayObj) => {
        if (!dayObj.isCurrentMonth) return;
        onDateSelect(dayObj.dateStr);
    };

    const isDayAvailable = (dateStr) => {
        return availableDates.length === 0 || availableDates.includes(dateStr);
    };

    const isDaySelected = (dateStr) => {
        return selectedDate === dateStr;
    };

    const isDayToday = (dateStr) => {
        return dateStr === todayStr;
    };

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={goToPrevMonth}>‹</button>
                <div className="calendar-month-year">
                    {monthNames[month]} {year}
                </div>
                <button className="calendar-nav-btn" onClick={goToNextMonth}>›</button>
            </div>
            
            <div className="calendar-weekdays">
                {dayNames.map(day => (
                    <div key={day} className="calendar-weekday">{day}</div>
                ))}
            </div>
            
            <div className="calendar-days">
                {calendarDays.map((dayObj, index) => {
                    const isAvailable = isDayAvailable(dayObj.dateStr);
                    const isSelected = isDaySelected(dayObj.dateStr);
                    const isToday = isDayToday(dayObj.dateStr);
                    
                    return (
                        <div
                            key={index}
                            className={`calendar-day ${
                                !dayObj.isCurrentMonth ? 'other-month' : ''
                            } ${
                                isSelected ? 'selected' : ''
                            } ${
                                isToday ? 'today' : ''
                            } ${
                                isAvailable && dayObj.isCurrentMonth ? 'available' : ''
                            }`}
                            onClick={() => handleDateClick(dayObj)}
                        >
                            {dayObj.day}
                            {isAvailable && dayObj.isCurrentMonth && (
                                <div className="availability-dot"></div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="calendar-footer">
                <button className="calendar-today-btn" onClick={goToToday}>
                    {language === 'en' ? 'Today' : '오늘'}
                </button>
            </div>
        </div>
    );
};

export default Calendar;