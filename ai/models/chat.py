# models/chat.py
from datetime import datetime
from models import db  
class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # ← nullable
    session_id = db.Column(db.String(64), nullable=True)                          # ← add this
    sender     = db.Column(db.String(10))
    message    = db.Column(db.Text)
    chat_type  = db.Column(db.String(20), default='hr')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'sender':     self.sender,
            'message':    self.message,
            'chat_type':  self.chat_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }