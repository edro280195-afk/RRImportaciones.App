import 'package:flutter/material.dart';
import '../../../shared/theme/app_tokens.dart';
import '../domain/auth_models.dart';

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

class PinDots extends StatelessWidget {
  const PinDots({super.key, required this.length});

  final int length;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(6, (index) {
        final filled = length > index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 8),
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: filled ? AppColors.red : Colors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: filled ? AppColors.red : AppColors.border,
              width: filled ? 1.0 : 1.8,
            ),
            boxShadow: filled
                ? const [
                    BoxShadow(
                      color: Color(0x33C61D26),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    )
                  ]
                : null,
          ),
        );
      }),
    );
  }
}

class PinKeypad extends StatelessWidget {
  const PinKeypad({
    super.key,
    required this.disabled,
    required this.onDigit,
    required this.onBackspace,
    this.biometricIcon,
    this.onBiometricTap,
  });

  final bool disabled;
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final IconData? biometricIcon;
  final VoidCallback? onBiometricTap;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 16,
        crossAxisSpacing: 24,
        childAspectRatio: 1.15,
      ),
      itemCount: 12,
      itemBuilder: (context, index) {
        if (index == 9) {
          // Posición inferior izquierda: Biometría o vacío
          if (biometricIcon != null && onBiometricTap != null) {
            return Center(
              child: SizedBox(
                width: 68,
                height: 68,
                child: IconButton(
                  onPressed: disabled ? null : onBiometricTap,
                  icon: Icon(biometricIcon, color: AppColors.red, size: 28),
                ),
              ),
            );
          }
          return const SizedBox.shrink();
        }
        
        if (index == 11) {
          // Posición inferior derecha: Retroceso
          return Center(
            child: SizedBox(
              width: 68,
              height: 68,
              child: InkWell(
                borderRadius: BorderRadius.circular(34),
                onTap: disabled ? null : onBackspace,
                child: const Center(
                  child: Icon(
                    Icons.backspace_outlined,
                    color: AppColors.ink2,
                    size: 24,
                  ),
                ),
              ),
            ),
          );
        }

        final digit = index == 10 ? '0' : (index + 1).toString();
        return Center(
          child: SizedBox(
            width: 68,
            height: 68,
            child: Material(
              color: Colors.white,
              shape: CircleBorder(
                side: BorderSide(color: AppColors.border.withValues(alpha: 0.8)),
              ),
              elevation: 1,
              shadowColor: Colors.black.withValues(alpha: 0.05),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: disabled ? null : () => onDigit(digit),
                child: Center(
                  child: Text(
                    digit,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.ink,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
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

class UserTile extends StatelessWidget {
  const UserTile({
    super.key,
    required this.user,
    required this.onTap,
    required this.onRemove,
  });

  final CampoUser user;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 10, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  LoginAvatar(initial: user.nombre, radius: 20),
                  const Spacer(),
                  // Botón discreto para eliminar perfil local
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 16),
                    onPressed: onRemove,
                    color: AppColors.ink3,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    style: IconButton.styleFrom(
                      hoverColor: AppColors.background,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                user.nombre,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                '@${user.username}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.ink2,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class UserListSkeleton extends StatelessWidget {
  const UserListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 2,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.3,
      ),
      itemBuilder: (context, index) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Color(0xFFF2F4F7),
                  shape: BoxShape.circle,
                ),
              ),
              const Spacer(),
              Container(
                width: 80,
                height: 10,
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F4F7),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                width: 50,
                height: 8,
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F4F7),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        );
      },
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
            'Acceso con contraseña',
            style: TextStyle(
              color: AppColors.ink,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Úsalo en el primer acceso o para cambiar de cuenta.',
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
