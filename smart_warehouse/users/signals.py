from django.dispatch import receiver
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.conf import settings

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    # Ссылка ведет на React страницу
    reset_url = f"http://185.146.3.192/reset-password-confirm?token={reset_password_token.key}"
    print("Ссылка для сброса пароля:", reset_url)  # видно в консоли
    send_mail(
        'Сброс пароля',
        f'Перейдите по ссылке, чтобы сбросить пароль: {reset_url}',
        settings.DEFAULT_FROM_EMAIL,
        [reset_password_token.user.email],
        fail_silently=False,
    )
