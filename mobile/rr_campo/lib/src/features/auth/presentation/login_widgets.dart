import 'package:flutter/material.dart';
import '../../../shared/theme/app_tokens.dart';

class LoginBrandHeader extends StatelessWidget {
  const LoginBrandHeader({super.key, this.trailing});

  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final trailingWidget = trailing;
    return Row(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.red,
            borderRadius: BorderRadius.circular(10),
            boxShadow: const [
              BoxShadow(
                color: Color(0x26C61D26),
                blurRadius: 8,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: const Icon(Icons.verified_user, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'R&R IMPORTACIONES',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  height: 1.1,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'ACCESO SEGURO',
                style: TextStyle(
                  color: AppColors.ink3,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
        ?trailingWidget,
      ],
    );
  }
}

class LoginAvatar extends StatelessWidget {
  const LoginAvatar({super.key, required this.initial, required this.radius});

  final String initial;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.redSoft,
      foregroundColor: AppColors.red,
      child: Text(
        initial.isEmpty ? '?' : initial.characters.first.toUpperCase(),
        style: TextStyle(
          fontSize: radius * 0.8,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class LoginInlineError extends StatelessWidget {
  const LoginInlineError({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFDF2F2),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: const Color(0xFFFDE8E8)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppColors.danger,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LoginErrorState extends StatelessWidget {
  const LoginErrorState({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off, color: AppColors.ink3, size: 36),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.ink2,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh, color: AppColors.red),
            label: const Text(
              'Reintentar',
              style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class PasswordPanel extends StatelessWidget {
  const PasswordPanel({
    super.key,
    required this.userController,
    required this.passController,
    required this.obscurePass,
    required this.onToggleObscure,
    required this.error,
    required this.saving,
    required this.onSubmit,
  });

  final TextEditingController userController;
  final TextEditingController passController;
  final bool obscurePass;
  final VoidCallback onToggleObscure;
  final String error;
  final bool saving;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Inicia sesión',
            style: TextStyle(
              color: AppColors.ink,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Solo se pide una vez en este dispositivo. Después entrarás con biometría.',
            style: TextStyle(color: AppColors.ink2, fontSize: 12),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: userController,
            enabled: !saving,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            cursorColor: AppColors.red,
            style: const TextStyle(fontWeight: FontWeight.w700),
            decoration: const InputDecoration(
              hintText: 'Usuario',
              prefixIcon: Icon(Icons.person_outline, color: AppColors.ink2),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: passController,
            enabled: !saving,
            obscureText: obscurePass,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onSubmit(),
            cursorColor: AppColors.red,
            style: const TextStyle(fontWeight: FontWeight.w700),
            decoration: InputDecoration(
              hintText: 'Contraseña',
              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.ink2),
              suffixIcon: IconButton(
                onPressed: saving ? null : onToggleObscure,
                icon: Icon(
                  obscurePass
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: AppColors.ink3,
                ),
              ),
            ),
          ),
          if (error.isNotEmpty) ...[
            const SizedBox(height: 12),
            LoginInlineError(message: error),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: saving ? null : onSubmit,
            child: saving
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Ingresar'),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward, size: 18),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
