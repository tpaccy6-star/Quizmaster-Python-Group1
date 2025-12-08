from flask import Blueprint, request, jsonify
from app.utils.decorators import jwt_required_with_role
from app.services.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required_with_role()
def get_notifications(current_user):
    """Get notifications for current user"""
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
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


@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@jwt_required_with_role()
def mark_read(notification_id, current_user):
    """Mark notification as read"""
    notification = NotificationService.mark_as_read(notification_id)

    if not notification or notification.user_id != current_user.id:
        return jsonify({'error': 'Notification not found'}), 404

    return jsonify({
        'success': True,
        'notification': notification.to_dict()
    }), 200


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required_with_role()
def mark_all_read(current_user):
    """Mark all notifications as read"""
    NotificationService.mark_all_as_read(current_user.id)
    return jsonify({
        'success': True,
        'message': 'All notifications marked as read'
    }), 200


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@jwt_required_with_role()
def delete_notification(notification_id, current_user):
    """Delete notification"""
    notification = NotificationService.mark_as_read(notification_id)

    if not notification or notification.user_id != current_user.id:
        return jsonify({'error': 'Notification not found'}), 404

    NotificationService.delete_notification(notification_id)
    return jsonify({'success': True}), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required_with_role()
def get_unread_count(current_user):
    """Get unread notifications count"""
    count = NotificationService.get_unread_count(current_user.id)
    return jsonify({'unread_count': count}), 200
