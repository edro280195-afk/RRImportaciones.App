import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../shared/theme/app_tokens.dart';
import '../domain/campo_constants.dart';

enum _FlashSetting { off, auto, on }

/// Cámara a pantalla completa con multidisparo.
/// Devuelve la lista de fotos tomadas (`List<XFile>`) al cerrar o tocar "Listo".
class CameraCapturePage extends StatefulWidget {
  const CameraCapturePage({super.key, this.alreadyTaken = 0});

  /// Fotos que ya tiene la unidad, para el contador de guía.
  final int alreadyTaken;

  @override
  State<CameraCapturePage> createState() => _CameraCapturePageState();
}

class _CameraCapturePageState extends State<CameraCapturePage>
    with WidgetsBindingObserver {
  CameraController? _camera;
  bool _ready = false;
  bool _capturing = false;
  String _error = '';
  _FlashSetting _flash = _FlashSetting.off;
  bool _torchOn = false;
  final List<XFile> _captured = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeCamera();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final camera = _camera;
    if (camera == null || !camera.value.isInitialized) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _disposeCamera();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _setError('No se encontró cámara disponible.');
        return;
      }
      final description = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        description,
        ResolutionPreset.high,
        enableAudio: false,
      );
      _camera = controller;
      await controller.initialize();
      await controller.setFlashMode(FlashMode.off).catchError((_) {});
      if (!mounted) return;
      setState(() {
        _ready = true;
        _error = '';
        _flash = _FlashSetting.off;
        _torchOn = false;
      });
    } catch (_) {
      _setError('Sin acceso a la cámara. Revisa los permisos.');
    }
  }

  Future<void> _disposeCamera() async {
    final controller = _camera;
    _camera = null;
    _ready = false;
    if (controller != null) {
      await controller.dispose().catchError((_) {});
    }
  }

  void _setError(String message) {
    if (!mounted) return;
    setState(() {
      _ready = false;
      _error = message;
    });
  }

  Future<void> _shutter() async {
    final controller = _camera;
    if (controller == null ||
        !_ready ||
        _capturing ||
        controller.value.isTakingPicture) {
      return;
    }
    setState(() => _capturing = true);
    try {
      HapticFeedback.selectionClick();
      await SystemSound.play(SystemSoundType.click);
      final photo = await controller.takePicture();
      setState(() => _captured.add(photo));
    } catch (_) {
      _showSnack('No se pudo tomar la foto, inténtalo de nuevo.');
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  Future<void> _cycleFlash() async {
    final controller = _camera;
    if (controller == null || !_ready) return;
    final next = switch (_flash) {
      _FlashSetting.off => _FlashSetting.auto,
      _FlashSetting.auto => _FlashSetting.on,
      _FlashSetting.on => _FlashSetting.off,
    };
    try {
      await controller.setFlashMode(_modeFor(next));
      if (!mounted) return;
      setState(() {
        _flash = next;
        _torchOn = false;
      });
    } catch (_) {
      _showSnack('Este dispositivo no permite cambiar el flash.');
    }
  }

  Future<void> _toggleTorch() async {
    final controller = _camera;
    if (controller == null || !_ready) return;
    try {
      final next = !_torchOn;
      await controller.setFlashMode(next ? FlashMode.torch : _modeFor(_flash));
      if (!mounted) return;
      setState(() => _torchOn = next);
    } catch (_) {
      _showSnack('Este dispositivo no permite la linterna aquí.');
    }
  }

  FlashMode _modeFor(_FlashSetting setting) => switch (setting) {
    _FlashSetting.off => FlashMode.off,
    _FlashSetting.auto => FlashMode.auto,
    _FlashSetting.on => FlashMode.always,
  };

  void _showSnack(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _finish() => Navigator.of(context).pop(_captured);

  @override
  Widget build(BuildContext context) {
    final controller = _camera;
    final total = widget.alreadyTaken + _captured.length;
    final remaining = kMinPhotos - total;
    final guide = remaining > 0
        ? 'Toma al menos $kMinPhotos fotos · $total ${total == 1 ? 'tomada' : 'tomadas'}'
        : '$total fotos · listo';
    final flashIcon = switch (_flash) {
      _FlashSetting.off => Icons.flash_off,
      _FlashSetting.auto => Icons.flash_auto,
      _FlashSetting.on => Icons.flash_on,
    };

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _finish();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (_ready && controller != null)
              _FullPreview(controller: controller)
            else if (_error.isNotEmpty)
              _CameraErrorView(message: _error, onRetry: _initCamera)
            else
              const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),

            // Barra superior.
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        _CircleButton(icon: Icons.close, onTap: _finish),
                        const Spacer(),
                        _CircleButton(
                          icon: flashIcon,
                          active: _flash != _FlashSetting.off,
                          onTap: _ready ? _cycleFlash : null,
                        ),
                        const SizedBox(width: 10),
                        _CircleButton(
                          icon: _torchOn
                              ? Icons.flashlight_on
                              : Icons.flashlight_off,
                          active: _torchOn,
                          onTap: _ready ? _toggleTorch : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        guide,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Controles inferiores.
            Align(
              alignment: Alignment.bottomCenter,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 22),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _LastThumb(captured: _captured),
                      _ShutterButton(
                        capturing: _capturing,
                        onTap: _ready ? _shutter : null,
                      ),
                      _DoneButton(count: _captured.length, onTap: _finish),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FullPreview extends StatelessWidget {
  const _FullPreview({required this.controller});

  final CameraController controller;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = controller.value.previewSize;
        if (size == null) return CameraPreview(controller);
        final previewAspectRatio = size.height / size.width;
        final screenAspectRatio = constraints.maxWidth / constraints.maxHeight;
        final scale = previewAspectRatio / screenAspectRatio;
        return ClipRect(
          child: Transform.scale(
            scale: scale < 1 ? 1 / scale : scale,
            child: Center(child: CameraPreview(controller)),
          ),
        );
      },
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({
    required this.icon,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final VoidCallback? onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.red : Colors.white.withValues(alpha: 0.16),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(9),
          child: Icon(
            icon,
            color: onTap == null ? Colors.white54 : Colors.white,
            size: 22,
          ),
        ),
      ),
    );
  }
}

class _ShutterButton extends StatelessWidget {
  const _ShutterButton({required this.capturing, required this.onTap});

  final bool capturing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 4),
        ),
        child: Padding(
          padding: const EdgeInsets.all(5),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: capturing ? AppColors.redDark : AppColors.red,
            ),
            child: capturing
                ? const Padding(
                    padding: EdgeInsets.all(18),
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      color: Colors.white,
                    ),
                  )
                : null,
          ),
        ),
      ),
    );
  }
}

class _LastThumb extends StatelessWidget {
  const _LastThumb({required this.captured});

  final List<XFile> captured;

  @override
  Widget build(BuildContext context) {
    if (captured.isEmpty) {
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white24),
        ),
        child: const Icon(
          Icons.photo_outlined,
          color: Colors.white38,
          size: 20,
        ),
      );
    }
    return Stack(
      clipBehavior: Clip.none,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.file(
            File(captured.last.path),
            width: 48,
            height: 48,
            fit: BoxFit.cover,
          ),
        ),
        Positioned(
          top: -4,
          right: -4,
          child: CircleAvatar(
            radius: 11,
            backgroundColor: AppColors.red,
            child: Text(
              '${captured.length}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DoneButton extends StatelessWidget {
  const _DoneButton({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: count > 0 ? AppColors.red : Colors.white.withValues(alpha: 0.16),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Listo',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              if (count > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$count',
                    style: const TextStyle(
                      color: AppColors.red,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CameraErrorView extends StatelessWidget {
  const _CameraErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white70,
                size: 44,
              ),
              const SizedBox(height: 12),
              const Text(
                'Sin acceso a la cámara',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 14),
              OutlinedButton(
                onPressed: onRetry,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white54),
                ),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
