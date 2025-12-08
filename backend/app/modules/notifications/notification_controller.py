# Notification Controller
# Module Owner: Student 6 - Communication Specialist

# Handles HTTP requests for notification endpoints

from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role
from app.modules.notifications.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required_with_role()
def get_notifications(current_user):
    """Get notifications for current user"""
    try:
        unread_only = request.args.get(
            'unread_only', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        category = request.args.get('category')

        notifications = NotificationService.get_user_notifications(
            user_id=current_user.id,
            unread_only=unread_only,
            limit=limit,
            category=category
        )

        unread_count = NotificationService.get_unread_count(current_user.id)

        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count': unread_count,
            'total': len(notifications)
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch notifications', 'details': str(e)}), 500


@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@jwt_required_with_role()
def mark_read(current_user, notification_id):
    """Mark notification as read"""
    try:
        notification = NotificationService.mark_as_read(notification_id)

        if not notification or notification.user_id != current_user.id:
            return jsonify({'error': 'Notification not found'}), 404

        return jsonify({
            'success': True,
            'notification': notification.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to mark notification as read', 'details': str(e)}), 500


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required_with_role()
def mark_all_read(current_user):
    """Mark all notifications as read"""
    try:
        NotificationService.mark_all_as_read(current_user.id)
        return jsonify({
            'success': True,
            'message': 'All notifications marked as read'
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to mark all notifications as read', 'details': str(e)}), 500


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required_with_role()
def delete_notification(current_user, notification_id):
    """Delete notification"""
    try:
        notification = NotificationService.mark_as_read(notification_id)

        if not notification or notification.user_id != current_user.id:
            return jsonify({'error': 'Notification not found'}), 404

        NotificationService.delete_notification(notification_id)
        return jsonify({'success': True}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to delete notification', 'details': str(e)}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required_with_role()
def get_unread_count(current_user):
    """Get unread notifications count"""
    try:
        count = NotificationService.get_unread_count(current_user.id)
        return jsonify({'unread_count': count}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get unread count', 'details': str(e)}), 500


@notifications_bp.route('/stats', methods=['GET'])
@jwt_required_with_role()
def get_notification_stats(current_user):
    """Get notification statistics"""
    try:
        stats = NotificationService.get_notification_stats(current_user.id)
        return jsonify(stats), 200

    except Exception as e:
        return jsonify({'error': 'Failed to get notification stats', 'details': str(e)}), 500


@notifications_bp.route('/cleanup', methods=['POST'])
@jwt_required_with_role()
def cleanup_expired(current_user):
    """Clean up expired notifications (admin only)"""
    try:
        from app.models.user import UserRole

        if current_user.role != UserRole.ADMIN:
            return jsonify({'error': 'Unauthorized'}), 403

        count = NotificationService.cleanup_expired_notifications()

        return jsonify({
            'success': True,
            'message': f'Cleaned up {count} expired notifications'
        }), 200

    except Exception as e:
        return jsonify({'error': 'Failed to cleanup notifications', 'details': str(e)}), 500


@notifications_bp.route('/bulk', methods=['POST'])
@jwt_required_with_role()
def create_bulk_notifications(current_user):
    """Create bulk notifications (admin/teacher only)"""
    try:
        from app.models.user import UserRole

        if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        required_fields = ['user_ids', 'type', 'title', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        notifications = NotificationService.create_bulk_notifications(
            user_ids=data['user_ids'],
            notification_type=data['type'],
            title=data['title'],
            message=data['message'],
            link=data.get('link'),
            priority=data.get('priority', 'medium'),
            category=data.get('category', 'system'),
            action_url=data.get('action_url'),
            expires_at=data.get('expires_at'),
            extra_data=data.get('extra_data', {})
        )

        return jsonify({
            'message': f'Created {len(notifications)} notifications',
            'count': len(notifications)
        }), 201

    except Exception as e:
        return jsonify({'error': 'Failed to create bulk notifications', 'details': str(e)}), 500
