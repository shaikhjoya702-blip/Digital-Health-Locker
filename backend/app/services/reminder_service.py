from datetime import datetime, date, time
from typing import List, Dict, Any
from app.extensions import db
from app.models.medicine_reminder import MedicineReminder
from app.models.dose_log import DoseLog

class ReminderService:
    """
    Manages medication reminder schedules and dose logging.
    Calculates today's dose windows and updates adherence history.
    """

    @classmethod
    def get_today_doses_for_user(cls, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all active reminders for a user and calculates today's doses,
        matching them with logged dose statuses (taken, skipped, or pending/missed).
        """
        today = date.today()
        now = datetime.utcnow()

        # Query active reminders applicable for today
        reminders = MedicineReminder.query.filter(
            MedicineReminder.user_id == user_id,
            MedicineReminder.status == 'active',
            MedicineReminder.start_date <= today,
            db.or_(MedicineReminder.end_date.is_(None), MedicineReminder.end_date >= today)
        ).all()

        today_doses = []
        for rem in reminders:
            scheduled_times = rem.scheduled_times or []
            for t_str in scheduled_times:
                try:
                    hour, minute = map(int, t_str.split(':'))
                    scheduled_datetime = datetime.combine(today, time(hour, minute))
                except Exception:
                    continue

                # Check if a log entry already exists for this reminder and timestamp
                existing_log = DoseLog.query.filter(
                    DoseLog.reminder_id == rem.id,
                    DoseLog.user_id == user_id,
                    DoseLog.scheduled_for == scheduled_datetime
                ).first()

                if existing_log:
                    status = existing_log.status
                    logged_at = existing_log.taken_at.isoformat() if existing_log.taken_at else None
                    log_id = existing_log.id
                else:
                    # If scheduled time has passed by > 60 minutes and wasn't logged, mark as missed
                    if now > scheduled_datetime and (now - scheduled_datetime).total_seconds() > 3600:
                        status = 'missed'
                    else:
                        status = 'pending'
                    logged_at = None
                    log_id = None

                today_doses.append({
                    'log_id': log_id,
                    'reminder_id': rem.id,
                    'medicine_name': rem.medicine_name,
                    'dosage': rem.dosage,
                    'scheduled_time': t_str,
                    'scheduled_datetime': scheduled_datetime.isoformat(),
                    'meal_instruction': rem.meal_instruction,
                    'notes': rem.notes,
                    'status': status,
                    'logged_at': logged_at
                })

        # Sort by scheduled time
        today_doses.sort(key=lambda x: x['scheduled_time'])
        return today_doses

    @classmethod
    def record_dose_status(cls, reminder_id: str, user_id: str, scheduled_datetime: datetime, status: str, note: str = None) -> DoseLog:
        """
        Records or updates a dose status for a scheduled time (taken, skipped).
        """
        existing = DoseLog.query.filter_by(
            reminder_id=reminder_id,
            user_id=user_id,
            scheduled_for=scheduled_datetime
        ).first()

        now = datetime.utcnow()
        if existing:
            existing.status = status
            existing.taken_at = now if status == 'taken' else None
            existing.note = note
            db.session.commit()
            return existing

        new_log = DoseLog(
            reminder_id=reminder_id,
            user_id=user_id,
            scheduled_for=scheduled_datetime,
            taken_at=now if status == 'taken' else None,
            status=status,
            note=note
        )
        db.session.add(new_log)
        db.session.commit()
        return new_log

reminder_service = ReminderService()
