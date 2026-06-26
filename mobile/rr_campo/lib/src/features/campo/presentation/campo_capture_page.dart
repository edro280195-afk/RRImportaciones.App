import 'dart:convert';
import 'dart:io';

import 'package:camera/camera.dart' show XFile;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/api/api_client.dart';
import '../../../shared/session/session_controller.dart';
import '../../../shared/theme/app_tokens.dart';
import '../data/campo_api.dart';
import '../domain/campo_constants.dart';
import '../domain/tarea_campo.dart';
import '../domain/vin_parser.dart';
import 'camera_capture_page.dart';
import 'campo_tasks_page.dart';
import 'mlkit_vin_scanner_page.dart';

final campoTaskProvider = FutureProvider.autoDispose.family<TareaCampo, String>(
  (ref, id) {
    return ref.watch(campoApiProvider).getById(id);
  },
);

class CampoCapturePage extends ConsumerStatefulWidget {
  const CampoCapturePage({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<CampoCapturePage> createState() => _CampoCapturePageState();
}

class _CampoCapturePageState extends ConsumerState<CampoCapturePage> {
  final _ubicacionController = TextEditingController();
  final _vinController = TextEditingController();
  final _incidenciaController = TextEditingController();
  final List<XFile> _localPhotos = [];
  final _heroController = PageController();

  bool _initialized = false;
  bool _draftLoaded = false;
  Map<String, dynamic> _draft = const {};

  bool _sending = false;
  int _uploadIndex = 0;
  int _uploadTotal = 0;
  int _heroIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadDraft();
  }

  @override
  void dispose() {
    _ubicacionController.dispose();
    _vinController.dispose();
    _incidenciaController.dispose();
    _heroController.dispose();
    super.dispose();
  }

  // ── Borrador local (equivalente al localStorage de Angular) ─────────────
  String get _draftKey => 'campo_draft_${widget.taskId}';

  Future<void> _loadDraft() async {
    try {
      final raw = await ref.read(secureStorageProvider).read(key: _draftKey);
      if (raw != null) _draft = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      _draft = const {};
    }
    if (mounted) setState(() => _draftLoaded = true);
  }

  void _persistDraft() {
    ref
        .read(secureStorageProvider)
        .write(
          key: _draftKey,
          value: jsonEncode({
            'ubicacion': _ubicacionController.text,
            'vin': _vinController.text,
            'incidencia': _incidenciaController.text,
          }),
        );
  }

  void _clearDraft() {
    ref.read(secureStorageProvider).delete(key: _draftKey);
  }

  void _initializeFromTask(TareaCampo task) {
    if (_initialized || !_draftLoaded) return;
    _initialized = true;

    final draftUbicacion = _draft['ubicacion'] as String?;
    final draftVin = _draft['vin'] as String?;
    final draftIncidencia = _draft['incidencia'] as String?;

    _ubicacionController.text = (draftUbicacion?.isNotEmpty ?? false)
        ? draftUbicacion!
        : (task.ubicacion ?? '');
    _vinController.text = (draftVin?.isNotEmpty ?? false)
        ? draftVin!
        : toShortVin(task.vinConfirmado ?? task.vinCorto ?? '');
    _incidenciaController.text = (draftIncidencia?.isNotEmpty ?? false)
        ? draftIncidencia!
        : (task.incidencia ?? '');

    if (task.estatus == 'ABIERTA') {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        try {
          await ref.read(campoApiProvider).tomar(task.id);
          ref.invalidate(campoTaskProvider(task.id));
          ref.invalidate(campoTasksProvider);
        } catch (_) {
          // Si falla tomar, el usuario aún puede reintentar al guardar.
        }
      });
    }
  }

  // ── Fotos ───────────────────────────────────────────────────────────────
  Future<void> _openCamera(int alreadyTaken) async {
    final result = await Navigator.of(context).push<List<XFile>>(
      MaterialPageRoute(
        builder: (_) => CameraCapturePage(alreadyTaken: alreadyTaken),
      ),
    );
    if (!mounted || result == null || result.isEmpty) return;
    setState(() => _localPhotos.addAll(result));
  }

  void _removeLocalPhoto(XFile photo) {
    setState(() {
      _localPhotos.remove(photo);
      if (_heroIndex > 0) _heroIndex--;
    });
  }

  // ── VIN ───────────────────────────────────────────────────────────────
  String _normalizeCapturedVin(String value) {
    final extracted = extractVinCandidate(value);
    return extracted == null ? toShortVin(value) : toShortVin(extracted);
  }

  void _onVinChanged(String value) {
    final normalized = _normalizeCapturedVin(value);
    if (value != normalized) {
      _vinController.value = TextEditingValue(
        text: normalized,
        selection: TextSelection.collapsed(offset: normalized.length),
      );
    }
    _persistDraft();
    setState(() {});
  }

  Future<void> _scanVin() async {
    final vin = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const MlkitVinScannerPage()),
    );
    if (!mounted || vin == null) return;
    final shortVin = toShortVin(vin);
    if (shortVin.isEmpty) return;
    setState(() => _vinController.text = shortVin);
    _persistDraft();
    _showMessage('VIN escaneado: $shortVin');
  }

  // ── Guardar ───────────────────────────────────────────────────────────
  Future<void> _sendReport(TareaCampo initialTask, int totalPhotos) async {
    if (_sending || totalPhotos == 0) return;
    setState(() {
      _sending = true;
      _uploadIndex = 0;
      _uploadTotal = _localPhotos.length;
    });

    try {
      final api = ref.read(campoApiProvider);
      var task = initialTask;
      var fotos = [...task.fotosUrls];

      for (var i = 0; i < _localPhotos.length; i++) {
        setState(() => _uploadIndex = i + 1);
        final uploaded = await api.uploadFoto(task.id, _localPhotos[i]);
        task = uploaded.tarea;
        fotos = [...task.fotosUrls];
      }

      await api.completar(
        task.id,
        ubicacion: _clean(_ubicacionController.text),
        vinConfirmado: _clean(_normalizeCapturedVin(_vinController.text)),
        fotosUrls: fotos,
        incidencia: _clean(_incidenciaController.text),
      );

      _clearDraft();
      ref.invalidate(campoTaskProvider(widget.taskId));
      ref.invalidate(campoTasksProvider);
      HapticFeedback.mediumImpact();
      if (!mounted) return;
      _showMessage('¡Captura guardada!');
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/campo');
      }
    } on ApiException catch (error) {
      if (!mounted) return;
      _showMessage(error.message);
    } catch (_) {
      if (!mounted) return;
      _showMessage('No se pudo guardar la captura');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String? _clean(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _openViewer(
    List<_HeroItem> items,
    int index,
    String Function(String) fileUrl,
  ) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black,
      builder: (_) => _PhotoViewer(
        items: items,
        initialIndex: index,
        fileUrl: fileUrl,
        onDeleteLocal: (photo) {
          Navigator.of(context).pop();
          _removeLocalPhoto(photo);
        },
      ),
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final taskAsync = ref.watch(campoTaskProvider(widget.taskId));
    final user = ref.watch(sessionControllerProvider).asData?.value.user;
    final fileUrl = ref.watch(campoApiProvider).fileUrl;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: taskAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _DetailError(
          message: error.toString(),
          onRetry: () => ref.invalidate(campoTaskProvider(widget.taskId)),
          onBack: _goBack,
        ),
        data: (task) {
          _initializeFromTask(task);
          final heroItems = <_HeroItem>[
            for (final url in task.fotosUrls) _HeroItem.server(url),
            for (final photo in _localPhotos) _HeroItem.local(photo),
          ];
          final totalPhotos = heroItems.length;
          final heroHeight = (MediaQuery.sizeOf(context).height * 0.36).clamp(
            220.0,
            340.0,
          );

          return Column(
            children: [
              SizedBox(
                height: heroHeight,
                width: double.infinity,
                child: _Hero(
                  items: heroItems,
                  controller: _heroController,
                  index: _heroIndex.clamp(
                    0,
                    totalPhotos == 0 ? 0 : totalPhotos - 1,
                  ),
                  userInitial: user?.nombre,
                  fileUrl: fileUrl,
                  onBack: _goBack,
                  onPageChanged: (i) => setState(() => _heroIndex = i),
                  onTapPhoto: (i) => _openViewer(heroItems, i, fileUrl),
                  onTakeFirst: () => _openCamera(totalPhotos),
                ),
              ),
              Expanded(
                child: _Panel(
                  task: task,
                  totalPhotos: totalPhotos,
                  serverFotos: task.fotosUrls,
                  localPhotos: _localPhotos,
                  fileUrl: fileUrl,
                  sending: _sending,
                  ubicacionController: _ubicacionController,
                  vinController: _vinController,
                  incidenciaController: _incidenciaController,
                  onTakePhotos: () => _openCamera(totalPhotos),
                  onRemovePhoto: _removeLocalPhoto,
                  onUbicacionChanged: (_) {
                    _persistDraft();
                    setState(() {});
                  },
                  onVinChanged: _onVinChanged,
                  onIncidenciaChanged: (_) {
                    _persistDraft();
                    setState(() {});
                  },
                  onScanVin: _scanVin,
                ),
              ),
            ],
          );
        },
      ),
      bottomSheet: taskAsync.hasValue
          ? _SaveBar(
              sending: _sending,
              uploadIndex: _uploadIndex,
              uploadTotal: _uploadTotal,
              alreadyCaptured: taskAsync.value!.estaCerrada,
              canSave:
                  !taskAsync.value!.estaCerrada &&
                  (taskAsync.value!.fotosUrls.length + _localPhotos.length) >
                      0 &&
                  !_sending,
              onSave: () => _sendReport(
                taskAsync.value!,
                taskAsync.value!.fotosUrls.length + _localPhotos.length,
              ),
            )
          : null,
    );
  }

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/campo');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// Modelo de foto para el hero/visor
// ════════════════════════════════════════════════════════════════════════
class _HeroItem {
  const _HeroItem.server(this.url) : isLocal = false, file = null;
  const _HeroItem.local(this.file) : isLocal = true, url = null;

  final bool isLocal;
  final String? url;
  final XFile? file;
}

// ════════════════════════════════════════════════════════════════════════
// Hero del vehículo (galería deslizable + overlays)
// ════════════════════════════════════════════════════════════════════════
class _Hero extends StatelessWidget {
  const _Hero({
    required this.items,
    required this.controller,
    required this.index,
    required this.userInitial,
    required this.fileUrl,
    required this.onBack,
    required this.onPageChanged,
    required this.onTapPhoto,
    required this.onTakeFirst,
  });

  final List<_HeroItem> items;
  final PageController controller;
  final int index;
  final String? userInitial;
  final String Function(String) fileUrl;
  final VoidCallback onBack;
  final ValueChanged<int> onPageChanged;
  final ValueChanged<int> onTapPhoto;
  final VoidCallback onTakeFirst;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (items.isEmpty)
          _EmptyHero(onTakeFirst: onTakeFirst)
        else
          PageView.builder(
            controller: controller,
            onPageChanged: onPageChanged,
            itemCount: items.length,
            itemBuilder: (context, i) {
              final item = items[i];
              return GestureDetector(
                onTap: () => onTapPhoto(i),
                child: ColoredBox(
                  color: const Color(0xFF2B2F36),
                  child: item.isLocal
                      ? Image.file(File(item.file!.path), fit: BoxFit.cover)
                      : Image.network(fileUrl(item.url!), fit: BoxFit.cover),
                ),
              );
            },
          ),

        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black54, Colors.transparent],
              ),
            ),
          ),
        ),

        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  _RoundIconButton(icon: Icons.arrow_back, onTap: onBack),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.fromLTRB(6, 6, 12, 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: AppColors.red,
                          foregroundColor: Colors.white,
                          child: Text(
                            (userInitial == null || userInitial!.isEmpty)
                                ? '?'
                                : userInitial!.characters.first.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Campo',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        if (items.length > 1)
          Positioned(
            bottom: 10,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(items.length, (i) {
                final active = i == index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 16 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: active ? Colors.white : Colors.white54,
                    borderRadius: BorderRadius.circular(999),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }
}

class _EmptyHero extends StatelessWidget {
  const _EmptyHero({required this.onTakeFirst});

  final VoidCallback onTakeFirst;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTakeFirst,
      child: ColoredBox(
        color: const Color(0xFF2B2F36),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.directions_car_filled_outlined,
                color: Color(0xFF8B93A1),
                size: 56,
              ),
              const SizedBox(height: 8),
              Text(
                'Toca para tomar la primera foto',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// Panel inferior (datos + acciones)
// ════════════════════════════════════════════════════════════════════════
class _Panel extends StatelessWidget {
  const _Panel({
    required this.task,
    required this.totalPhotos,
    required this.serverFotos,
    required this.localPhotos,
    required this.fileUrl,
    required this.sending,
    required this.ubicacionController,
    required this.vinController,
    required this.incidenciaController,
    required this.onTakePhotos,
    required this.onRemovePhoto,
    required this.onUbicacionChanged,
    required this.onVinChanged,
    required this.onIncidenciaChanged,
    required this.onScanVin,
  });

  final TareaCampo task;
  final int totalPhotos;
  final List<String> serverFotos;
  final List<XFile> localPhotos;
  final String Function(String) fileUrl;
  final bool sending;
  final TextEditingController ubicacionController;
  final TextEditingController vinController;
  final TextEditingController incidenciaController;
  final VoidCallback onTakePhotos;
  final ValueChanged<XFile> onRemovePhoto;
  final ValueChanged<String> onUbicacionChanged;
  final ValueChanged<String> onVinChanged;
  final ValueChanged<String> onIncidenciaChanged;
  final VoidCallback onScanVin;

  @override
  Widget build(BuildContext context) {
    final vin = vinController.text;
    final vinDone = vin.isNotEmpty;
    final ubicacionDone = ubicacionController.text.trim().isNotEmpty;
    final fotosDone = totalPhotos >= kMinPhotos;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 96),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  task.vehiculoResumen,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  task.folio,
                  style: const TextStyle(
                    color: AppColors.ink2,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (task.clienteNombre != null && task.clienteNombre!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              task.clienteNombre!,
              style: const TextStyle(color: AppColors.ink2, fontSize: 13),
            ),
          ],
          const SizedBox(height: 16),
          _StepRail(
            fotosLabel: '$totalPhotos/$kMinPhotos',
            fotosDone: fotosDone,
            vinValue: vinDone ? vin : '——',
            vinDone: vinDone,
            ubicacionValue: ubicacionDone
                ? ubicacionController.text.trim()
                : '——',
            ubicacionDone: ubicacionDone,
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: sending ? null : onTakePhotos,
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(totalPhotos == 0 ? 'Tomar fotos' : 'Tomar más fotos'),
          ),
          if (!fotosDone)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: Text(
                  totalPhotos == 0
                      ? 'Mínimo $kMinPhotos fotos de la unidad'
                      : 'Faltan ${kMinPhotos - totalPhotos} fotos para continuar',
                  style: const TextStyle(color: AppColors.ink3, fontSize: 12),
                ),
              ),
            ),
          if (totalPhotos > 0) ...[
            const SizedBox(height: 14),
            _PhotoStrip(
              serverFotos: serverFotos,
              localPhotos: localPhotos,
              fileUrl: fileUrl,
              sending: sending,
              onRemove: onRemovePhoto,
            ),
          ],
          const SizedBox(height: 18),
          _FieldsCard(
            task: task,
            ubicacionController: ubicacionController,
            vinController: vinController,
            incidenciaController: incidenciaController,
            onUbicacionChanged: onUbicacionChanged,
            onVinChanged: onVinChanged,
            onIncidenciaChanged: onIncidenciaChanged,
            onScanVin: onScanVin,
          ),
        ],
      ),
    );
  }
}

class _StepRail extends StatelessWidget {
  const _StepRail({
    required this.fotosLabel,
    required this.fotosDone,
    required this.vinValue,
    required this.vinDone,
    required this.ubicacionValue,
    required this.ubicacionDone,
  });

  final String fotosLabel;
  final bool fotosDone;
  final String vinValue;
  final bool vinDone;
  final String ubicacionValue;
  final bool ubicacionDone;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Step(
          icon: Icons.photo_camera_outlined,
          label: 'Fotos',
          value: fotosLabel,
          done: fotosDone,
          active: !fotosDone,
        ),
        _StepLine(done: fotosDone),
        _Step(
          icon: Icons.tag,
          label: 'VIN',
          value: vinValue,
          done: vinDone,
          active: fotosDone && !vinDone,
        ),
        _StepLine(done: vinDone),
        _Step(
          icon: Icons.location_on_outlined,
          label: 'Ubicación',
          value: ubicacionValue,
          done: ubicacionDone,
          active: vinDone && !ubicacionDone,
        ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.icon,
    required this.label,
    required this.value,
    required this.done,
    required this.active,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = done
        ? AppColors.success
        : active
        ? AppColors.red
        : AppColors.ink3;
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: done ? AppColors.successSoft : Colors.transparent,
              shape: BoxShape.circle,
              border: Border.all(color: color, width: 2),
            ),
            child: Icon(done ? Icons.check : icon, color: color, size: 19),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.ink2,
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _StepLine extends StatelessWidget {
  const _StepLine({required this.done});

  final bool done;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: SizedBox(
        width: 22,
        child: Divider(
          color: done ? AppColors.success : AppColors.border,
          thickness: 2,
        ),
      ),
    );
  }
}

class _PhotoStrip extends StatelessWidget {
  const _PhotoStrip({
    required this.serverFotos,
    required this.localPhotos,
    required this.fileUrl,
    required this.sending,
    required this.onRemove,
  });

  final List<String> serverFotos;
  final List<XFile> localPhotos;
  final String Function(String) fileUrl;
  final bool sending;
  final ValueChanged<XFile> onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 78,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final url in serverFotos)
            _Thumb(
              badge: const _CheckBadge(),
              child: Image.network(fileUrl(url), fit: BoxFit.cover),
            ),
          for (final photo in localPhotos)
            _Thumb(
              badge: sending
                  ? null
                  : _RemoveBadge(onTap: () => onRemove(photo)),
              child: Image.file(File(photo.path), fit: BoxFit.cover),
            ),
        ],
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.child, this.badge});

  final Widget child;
  final Widget? badge;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: SizedBox(
        width: 78,
        height: 78,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ClipRRect(borderRadius: BorderRadius.circular(12), child: child),
            if (badge != null) Positioned(top: 4, right: 4, child: badge!),
          ],
        ),
      ),
    );
  }
}

class _CheckBadge extends StatelessWidget {
  const _CheckBadge();

  @override
  Widget build(BuildContext context) {
    return const CircleAvatar(
      radius: 10,
      backgroundColor: AppColors.success,
      child: Icon(Icons.check, size: 13, color: Colors.white),
    );
  }
}

class _RemoveBadge extends StatelessWidget {
  const _RemoveBadge({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: const CircleAvatar(
        radius: 11,
        backgroundColor: Colors.black54,
        child: Icon(Icons.close, size: 14, color: Colors.white),
      ),
    );
  }
}

class _FieldsCard extends StatelessWidget {
  const _FieldsCard({
    required this.task,
    required this.ubicacionController,
    required this.vinController,
    required this.incidenciaController,
    required this.onUbicacionChanged,
    required this.onVinChanged,
    required this.onIncidenciaChanged,
    required this.onScanVin,
  });

  final TareaCampo task;
  final TextEditingController ubicacionController;
  final TextEditingController vinController;
  final TextEditingController incidenciaController;
  final ValueChanged<String> onUbicacionChanged;
  final ValueChanged<String> onVinChanged;
  final ValueChanged<String> onIncidenciaChanged;
  final VoidCallback onScanVin;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: ubicacionController,
          onChanged: onUbicacionChanged,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(
            labelText: 'Ubicación en yarda',
            hintText: 'Ej: Fila A, cajón 12',
            prefixIcon: Icon(Icons.location_on_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: vinController,
          onChanged: onVinChanged,
          textCapitalization: TextCapitalization.characters,
          maxLength: 6,
          decoration: InputDecoration(
            labelText: 'VIN confirmado (últimos 6)',
            hintText: task.vinCorto ?? 'XXXXXX',
            prefixIcon: const Icon(Icons.pin_outlined),
            counterText: '',
            suffixIcon: IconButton(
              tooltip: 'Escanear VIN',
              onPressed: onScanVin,
              icon: const Icon(Icons.document_scanner_outlined),
            ),
          ),
        ),
        if (vinController.text.isNotEmpty && task.vinCorto != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: _VinMatchMessage(
              confirmedVin: vinController.text,
              expectedVin: task.vinCorto!,
            ),
          ),
        const SizedBox(height: 16),
        _IncidenciaField(
          controller: incidenciaController,
          onChanged: onIncidenciaChanged,
        ),
      ],
    );
  }
}

/// Campo de incidencia con tratamiento de alerta: ámbar en reposo,
/// rojo cuando hay un reporte escrito.
class _IncidenciaField extends StatelessWidget {
  const _IncidenciaField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final hasContent = controller.text.trim().isNotEmpty;
    final accent = hasContent ? AppColors.danger : AppColors.warning;
    final bg = hasContent ? const Color(0xFFFDECEC) : const Color(0xFFFFF7E6);
    final border = hasContent ? AppColors.danger : const Color(0xFFEFC773);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: border, width: hasContent ? 1.6 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  hasContent
                      ? Icons.report_problem
                      : Icons.warning_amber_rounded,
                  color: accent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hasContent
                          ? '¡Incidencia reportada!'
                          : '¿La unidad tiene algún daño?',
                      style: TextStyle(
                        color: accent,
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      hasContent
                          ? 'Quedará marcada para revisión.'
                          : 'Repórtalo solo si hay golpe, rayón o falla.',
                      style: TextStyle(
                        color: accent.withValues(alpha: 0.85),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            onChanged: onChanged,
            minLines: 2,
            maxLines: 5,
            decoration: InputDecoration(
              hintText: 'Describe el daño o problema…',
              filled: true,
              fillColor: Colors.white,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
                borderSide: BorderSide(color: border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
                borderSide: BorderSide(color: accent, width: 1.6),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VinMatchMessage extends StatelessWidget {
  const _VinMatchMessage({
    required this.confirmedVin,
    required this.expectedVin,
  });

  final String confirmedVin;
  final String expectedVin;

  @override
  Widget build(BuildContext context) {
    final matches = toShortVin(confirmedVin) == toShortVin(expectedVin);
    final color = matches ? AppColors.success : AppColors.danger;
    return Row(
      children: [
        Icon(
          matches ? Icons.check_circle_outline : Icons.warning_amber_outlined,
          size: 17,
          color: color,
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            matches
                ? 'Coincide con el sistema'
                : 'No coincide, verifica el VIN',
            style: TextStyle(color: color, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// Barra inferior: progreso de subida + Guardar
// ════════════════════════════════════════════════════════════════════════
class _SaveBar extends StatelessWidget {
  const _SaveBar({
    required this.sending,
    required this.uploadIndex,
    required this.uploadTotal,
    required this.alreadyCaptured,
    required this.canSave,
    required this.onSave,
  });

  final bool sending;
  final int uploadIndex;
  final int uploadTotal;
  final bool alreadyCaptured;
  final bool canSave;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final progress = uploadTotal == 0 ? null : uploadIndex / uploadTotal;
    final percent = progress == null ? 0 : (progress * 100).round();

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              if (sending) ...[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        uploadTotal == 0
                            ? 'Guardando…'
                            : 'Subiendo $uploadIndex de $uploadTotal · $percent%',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 6,
                          backgroundColor: AppColors.border,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 150,
                  child: FilledButton.icon(
                    onPressed: null,
                    icon: const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                    label: const Text('Guardando…'),
                  ),
                ),
              ] else
                Expanded(
                  child: FilledButton.icon(
                    onPressed: canSave ? onSave : null,
                    icon: Icon(
                      alreadyCaptured
                          ? Icons.check_circle
                          : Icons.check_circle_outline,
                    ),
                    label: Text(
                      alreadyCaptured
                          ? 'Unidad ya capturada'
                          : 'Guardar captura',
                    ),
                    style: alreadyCaptured
                        ? FilledButton.styleFrom(
                            backgroundColor: AppColors.success,
                            disabledBackgroundColor: AppColors.success
                                .withValues(alpha: 0.55),
                            disabledForegroundColor: Colors.white,
                          )
                        : null,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════════════════
// Visor de foto a pantalla completa
// ════════════════════════════════════════════════════════════════════════
class _PhotoViewer extends StatefulWidget {
  const _PhotoViewer({
    required this.items,
    required this.initialIndex,
    required this.fileUrl,
    required this.onDeleteLocal,
  });

  final List<_HeroItem> items;
  final int initialIndex;
  final String Function(String) fileUrl;
  final ValueChanged<XFile> onDeleteLocal;

  @override
  State<_PhotoViewer> createState() => _PhotoViewerState();
}

class _PhotoViewerState extends State<_PhotoViewer> {
  late final PageController _controller = PageController(
    initialPage: widget.initialIndex,
  );
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.items[_index.clamp(0, widget.items.length - 1)];
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _controller,
            onPageChanged: (i) => setState(() => _index = i),
            itemCount: widget.items.length,
            itemBuilder: (context, i) {
              final item = widget.items[i];
              return InteractiveViewer(
                child: Center(
                  child: item.isLocal
                      ? Image.file(File(item.file!.path))
                      : Image.network(widget.fileUrl(item.url!)),
                ),
              );
            },
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    _RoundIconButton(
                      icon: Icons.arrow_back,
                      onTap: () => Navigator.of(context).pop(),
                    ),
                    const Spacer(),
                    if (current.isLocal)
                      _RoundIconButton(
                        icon: Icons.delete_outline,
                        onTap: () => widget.onDeleteLocal(current.file!),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailError extends StatelessWidget {
  const _DetailError({
    required this.message,
    required this.onRetry,
    required this.onBack,
  });

  final String message;
  final VoidCallback onRetry;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: IconButton(
              onPressed: onBack,
              icon: const Icon(Icons.arrow_back, color: AppColors.ink2),
            ),
          ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.cloud_off,
                      size: 44,
                      color: AppColors.ink3,
                    ),
                    const SizedBox(height: 12),
                    Text(message, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: onRetry,
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
