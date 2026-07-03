import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../shared/theme/app_tokens.dart';

Future<String?> showPinSetupSheet(BuildContext context) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => const _PinSetupSheet(),
  );
}

class _PinSetupSheet extends StatefulWidget {
  const _PinSetupSheet();

  @override
  State<_PinSetupSheet> createState() => _PinSetupSheetState();
}

class _PinSetupSheetState extends State<_PinSetupSheet> {
  final _formKey = GlobalKey<FormState>();
  final _pinController = TextEditingController();
  final _confirmationController = TextEditingController();
  bool _obscurePin = true;

  @override
  void dispose() {
    _pinController.dispose();
    _confirmationController.dispose();
    super.dispose();
  }

  String? _validatePin(String? value) {
    final pin = value ?? '';
    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      return 'El PIN debe tener exactamente 6 dígitos.';
    }
    return null;
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.of(context).pop(_pinController.text);
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, keyboardInset + 24),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.pin_outlined, color: AppColors.red, size: 42),
              const SizedBox(height: 12),
              const Text(
                'Configura tu PIN rápido',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Lo usarás para iniciar una sesión nueva cuando no quieras '
                'escribir tu contraseña. La biometría solo desbloquea una '
                'sesión que ya existe en este dispositivo.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.ink2, height: 1.4),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _pinController,
                autofocus: true,
                obscureText: _obscurePin,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                validator: _validatePin,
                decoration: InputDecoration(
                  labelText: 'PIN de 6 dígitos',
                  prefixIcon: const Icon(Icons.password_rounded),
                  suffixIcon: IconButton(
                    onPressed: () => setState(() => _obscurePin = !_obscurePin),
                    icon: Icon(
                      _obscurePin ? Icons.visibility : Icons.visibility_off,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _confirmationController,
                obscureText: _obscurePin,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                validator: (value) {
                  final formatError = _validatePin(value);
                  if (formatError != null) return formatError;
                  if (value != _pinController.text) {
                    return 'Los PIN no coinciden.';
                  }
                  return null;
                },
                onFieldSubmitted: (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Confirma tu PIN',
                  prefixIcon: Icon(Icons.verified_user_outlined),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _submit,
                child: const Text('Guardar PIN'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Ahora no'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
