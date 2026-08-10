import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';

/// Muestra el formulario de cliente en una hoja inferior. Si [existing] se
/// provee, edita ese cliente; si no, crea uno nuevo. Devuelve el
/// [ClienteDetailDto] resultante o null si el usuario canceló.
Future<ClienteDetailDto?> showClienteFormSheet(
  BuildContext context, {
  ClienteDetailDto? existing,
}) {
  return showModalBottomSheet<ClienteDetailDto>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => _ClienteFormSheet(existing: existing),
  );
}

class _ClienteFormSheet extends ConsumerStatefulWidget {
  const _ClienteFormSheet({this.existing});

  final ClienteDetailDto? existing;

  @override
  ConsumerState<_ClienteFormSheet> createState() => _ClienteFormSheetState();
}

class _ClienteFormSheetState extends ConsumerState<_ClienteFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _apodoController = TextEditingController();
  final _nombreController = TextEditingController();
  final _rfcController = TextEditingController();
  final _telefonoController = TextEditingController();
  final _emailController = TextEditingController();
  final _procedenciaController = TextEditingController();
  final _direccionController = TextEditingController();
  final _notasController = TextEditingController();

  bool _saving = false;
  String _error = '';

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    if (existing != null) {
      _apodoController.text = existing.apodo;
      _nombreController.text = existing.nombreCompleto ?? '';
      _rfcController.text = existing.rfc ?? '';
      _telefonoController.text = existing.telefono ?? '';
      _emailController.text = existing.email ?? '';
      _procedenciaController.text = existing.procedencia ?? '';
      _direccionController.text = existing.direccion ?? '';
      _notasController.text = existing.notas ?? '';
    }
  }

  @override
  void dispose() {
    _apodoController.dispose();
    _nombreController.dispose();
    _rfcController.dispose();
    _telefonoController.dispose();
    _emailController.dispose();
    _procedenciaController.dispose();
    _direccionController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  String? _emptyToNull(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false) || _saving) return;
    setState(() {
      _saving = true;
      _error = '';
    });

    final request = ClienteRequest(
      apodo: _apodoController.text.trim(),
      nombreCompleto: _emptyToNull(_nombreController),
      rfc: _emptyToNull(_rfcController),
      telefono: _emptyToNull(_telefonoController),
      email: _emptyToNull(_emailController),
      procedencia: _emptyToNull(_procedenciaController),
      direccion: _emptyToNull(_direccionController),
      notas: _emptyToNull(_notasController),
    );

    try {
      final api = ref.read(adminApiProvider);
      final result = _isEditing
          ? await api.actualizarCliente(widget.existing!.id, request)
          : await api.crearCliente(request);
      if (mounted) Navigator.of(context).pop(result);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 20, 24, keyboardInset + 24),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              Text(
                _isEditing ? 'Editar cliente' : 'Nuevo cliente',
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _apodoController,
                autofocus: !_isEditing,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Apodo *',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
                validator: (value) => (value == null || value.trim().isEmpty)
                    ? 'El apodo es obligatorio.'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nombreController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Nombre completo',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _rfcController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'RFC',
                  prefixIcon: Icon(Icons.assignment_ind_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _telefonoController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Teléfono',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _procedenciaController,
                decoration: const InputDecoration(
                  labelText: 'Procedencia',
                  prefixIcon: Icon(Icons.flag_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _direccionController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Dirección',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notasController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Notas',
                  prefixIcon: Icon(Icons.notes_outlined),
                ),
              ),
              if (_error.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF2F2),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: const Color(0xFFFDE8E8)),
                  ),
                  child: Text(
                    _error,
                    style: const TextStyle(
                      color: AppColors.danger,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Text(_isEditing ? 'Guardar cambios' : 'Crear cliente'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _saving
                    ? null
                    : () => Navigator.of(context).pop(),
                child: const Text('Cancelar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
