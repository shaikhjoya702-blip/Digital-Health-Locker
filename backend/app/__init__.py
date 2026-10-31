import os
from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, migrate, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}},
        supports_credentials=True
    )

    # Ensure storage folder exists
    os.makedirs(app.config['STORAGE_DIR'], exist_ok=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.profile import profile_bp
    from app.routes.records import records_bp
    from app.routes.ai import ai_bp
    from app.routes.reminders import reminders_bp
    from app.routes.sharing import sharing_bp
    from app.routes.doctor_portal import doctor_portal_bp
    from app.routes.support import support_bp
    from app.routes.audit import audit_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(sharing_bp)
    app.register_blueprint(doctor_portal_bp)
    app.register_blueprint(support_bp)
    app.register_blueprint(audit_bp)

    # Global Health Check & Info Endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_status = 'connected'
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as e:
            db_status = f'disconnected: {str(e)}'

        return jsonify({
            'status': 'healthy',
            'service': 'Digital Health Locker API',
            'version': '1.0.0',
            'database': db_status,
            'official_support_email': app.config.get('SUPPORT_EMAIL', 'xoya0102@gmail.com')
        }), 200

    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found.'}), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({'error': 'Uploaded file exceeds the maximum 15MB limit.'}), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'An internal server error occurred.'}), 500

    return app
