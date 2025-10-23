from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Robot

class RobotJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        robot_id = validated_token.get('robot_id')
        if not robot_id:
            return None
        return Robot.objects.filter(robot_id=robot_id, is_active=True).first()

