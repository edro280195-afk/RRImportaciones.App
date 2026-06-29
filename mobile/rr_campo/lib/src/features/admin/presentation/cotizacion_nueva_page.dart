import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../campo/presentation/mlkit_vin_scanner_page.dart';
import '../data/admin_api.dart';
import '../domain/admin_models.dart';
import 'cotizacion_detail_page.dart';

class CotizacionNuevaPage extends ConsumerStatefulWidget {
  const CotizacionNuevaPage({super.key, this.startWithScan = false});

  final bool startWithScan;

  @override
  ConsumerState<CotizacionNuevaPage> createState() =>
      _CotizacionNuevaPageState();
}

class _CotizacionNuevaPageState extends ConsumerState<CotizacionNuevaPage> {
  int _currentStep = 0;
  int _wizardEpoch = 0;
  int _clientSearchEpoch = 0;
  bool _loading = false;
  String? _errorMessage;
  late final PageController _pageController;

  // ── Step 0: VIN & Decode ──
  final _vinController = TextEditingController();
  VehicleDecodedDto? _decodedVehicle;

  // ── Step 1: Candidates Anexo 2 ──
  CandidatosPrecioOutput? _candidatesOutput;
  CandidatoPrecio? _selectedCandidate;
  final _valorAduanaController = TextEditingController();

  // ── Step 2: Fiscal & Type of Change ──
  String _selectedTipoTramite = 'NORMAL';
  String? _selectedCategoriaAmparo = 'NORMAL';
  final _tipoCambioAplicadoController = TextEditingController();
  final _honorariosController = TextEditingController();
  TipoCambioDto? _tipoCambio;
  String _selectedTcContexto = 'FIX';
  CotizacionOutput? _calculatedOutput;
  bool _showFiscalOptions = false;

  // ── Step 3: Client & Save ──
  ClienteListDto? _selectedCliente;
  final _notasController = TextEditingController();

  String get _detectedFiscalRegime {
    final year = _decodedVehicle?.modelYear;
    if (year == null) return 'PENDIENTE';
    if (year >= 2019 && year <= 2021) return 'AMPARO';
    return year >= 2017 ? 'POST_2017' : 'PRE_2016';
  }

  String get _detectedFiscalRegimeLabel {
    return switch (_detectedFiscalRegime) {
      'AMPARO' => 'Amparo',
      'POST_2017' => 'Modelo 2017 o posterior',
      'PRE_2016' => 'Modelo 2016 o anterior',
      _ => 'Se determinará con el año modelo',
    };
  }

  double? get _tipoCambioAplicadoValue {
    final raw = _tipoCambioAplicadoController.text
        .replaceAll(',', '')
        .replaceAll('\$', '')
        .trim();
    if (raw.isEmpty) return null;
    return double.tryParse(raw);
  }

  bool get _tipoCambioInputInvalido {
    final raw = _tipoCambioAplicadoController.text.trim();
    final value = _tipoCambioAplicadoValue;
    return raw.isNotEmpty && (value == null || value <= 0);
  }

  double get _tcMargenCalculado {
    final referencia = _tipoCambio?.tipoCambio;
    final aplicado = _tipoCambioAplicadoValue;
    if (referencia == null || aplicado == null) return 0;
    return aplicado - referencia;
  }

  CotizacionInput _buildCotizacionInput(VehicleDecodedDto vehicle) {
    return CotizacionInput(
      vin: vehicle.vin,
      marca: vehicle.make,
      modelo: vehicle.model,
      anno: vehicle.modelYear,
      cilindradaCm3: vehicle.displacementCC?.toInt(),
      tipoVehiculo: vehicle.vehicleType,
      valorAduanaUsdOverride: _selectedCandidate == null
          ? double.tryParse(_valorAduanaController.text)
          : null,
      precioEstimadoIdOverride: _selectedCandidate?.precioEstimadoId,
      categoriaAmparoOverride: _detectedFiscalRegime == 'AMPARO'
          ? _selectedCategoriaAmparo
          : null,
      tcMargen: _tcMargenCalculado,
      tipoCambioOverride: _tipoCambioAplicadoValue,
      tipoCambioContexto: _selectedTcContexto,
      tipoTramite: _selectedTipoTramite,
      honorariosOverride: _honorariosController.text.trim().isEmpty
          ? null
          : double.tryParse(_honorariosController.text),
    );
  }

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: _currentStep);
    _vinController.addListener(() {
      final text = _vinController.text.toUpperCase();
      if (_vinController.text != text) {
        _vinController.value = _vinController.value.copyWith(
          text: text,
          selection: _vinController.selection,
        );
      }
    });

    if (widget.startWithScan) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scanVin());
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _vinController.dispose();
    _valorAduanaController.dispose();
    _tipoCambioAplicadoController.dispose();
    _honorariosController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _scanVin() async {
    VehicleDecodedDto? decodedFromScan;
    final scannedVin = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => MlkitVinScannerPage(
          onValidateVin: (vin) async {
            try {
              final decoded = await ref.read(adminApiProvider).decodeVin(vin);
              decodedFromScan = decoded;
              final vehicleLabel = [
                if ((decoded.make ?? '').trim().isNotEmpty)
                  decoded.make!.trim(),
                if ((decoded.model ?? '').trim().isNotEmpty)
                  decoded.model!.trim(),
                if (decoded.modelYear != null) '${decoded.modelYear}',
              ].join(' ');

              return VinScannerValidationResult.success(
                title: 'Vehículo encontrado',
                subtitle: vehicleLabel.isEmpty
                    ? 'VIN validado correctamente.'
                    : vehicleLabel,
              );
            } catch (_) {
              decodedFromScan = null;
              return const VinScannerValidationResult.failure(
                title: 'VIN no validado',
                subtitle:
                    'No encontramos un vehículo con ese VIN. Escanéalo nuevamente.',
              );
            }
          },
        ),
      ),
    );
    if (scannedVin != null && scannedVin.isNotEmpty) {
      final decoded = decodedFromScan;
      setState(() {
        _vinController.text = scannedVin;
        _decodedVehicle = decoded;
        _candidatesOutput = null;
        _selectedCandidate = null;
        _calculatedOutput = null;
        _errorMessage = null;
      });
      if (decoded != null) {
        _goToPage(1);
        _fetchCandidates();
      } else {
        _decodeVin();
      }
    }
  }

  Future<void> _decodeVin() async {
    final vin = _vinController.text.trim();
    if (vin.length != 17) {
      setState(
        () => _errorMessage = 'El VIN debe tener exactamente 17 caracteres.',
      );
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final decoded = await ref.read(adminApiProvider).decodeVin(vin);
      setState(() {
        _decodedVehicle = decoded;
      });
      _goToPage(1);
      _fetchCandidates();
    } catch (e) {
      setState(() {
        _errorMessage =
            'Error al decodificar VIN: $e. Ingresa los datos manualmente.';
        _decodedVehicle = VehicleDecodedDto(vin: vin);
      });
      _goToPage(1);
      _fetchCandidates();
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchCandidates() async {
    final vehicle = _decodedVehicle;
    if (vehicle == null) return;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final input = _buildCotizacionInput(vehicle);

      final candidates = await ref
          .read(adminApiProvider)
          .obtenerCandidatos(input);
      setState(() {
        _candidatesOutput = candidates;
        if (candidates.candidatos.isNotEmpty) {
          _selectedCandidate = candidates.candidatos.firstWhere(
            (c) => c.esSugerido,
            orElse: () => candidates.candidatos.first,
          );
          _valorAduanaController.text = _selectedCandidate!.precioUsd
              .toString();
        }
      });
    } catch (e) {
      setState(
        () => _errorMessage =
            'No se pudieron cargar candidatos del SAT Anexo 2: $e',
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchTipoCambioAndRates() async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final tc = await ref
          .read(adminApiProvider)
          .getTipoCambio(_selectedTcContexto);
      setState(() {
        _tipoCambio = tc;
        _tipoCambioAplicadoController.text = tc.tipoCambio.toStringAsFixed(4);
      });
    } catch (e) {
      setState(
        () => _errorMessage = 'No se pudo cargar tipo de cambio Banxico: $e',
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _calculateTaxes() async {
    final vehicle = _decodedVehicle;
    if (vehicle == null) return;
    if (_tipoCambioInputInvalido) {
      setState(
        () => _errorMessage = 'Ingresa un tipo de cambio válido mayor a cero.',
      );
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final input = _buildCotizacionInput(vehicle);

      final output = await ref.read(adminApiProvider).calcularCotizacion(input);
      setState(() {
        _calculatedOutput = output;
      });
      _goToPage(3);
    } catch (e) {
      setState(() => _errorMessage = 'Error al calcular cotización: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _saveCotizacion() async {
    final vehicle = _decodedVehicle;
    final calc = _calculatedOutput;
    if (vehicle == null || calc == null) return;

    if (_selectedCliente == null) {
      setState(() => _errorMessage = 'Debes seleccionar un cliente.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final input = _buildCotizacionInput(vehicle);

      final request = GuardarCotizacionRequest(
        input: input,
        clienteId: _selectedCliente!.id,
        notas: _notasController.text.trim().isEmpty
            ? null
            : _notasController.text.trim(),
      );

      final result = await ref.read(adminApiProvider).crearCotizacion(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cotización guardada exitosamente')),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CotizacionDetailPage(cotizacionId: result.id!),
          ),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = 'Error al guardar cotización: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _goToPage(int page) {
    setState(() {
      _currentStep = page;
      _errorMessage = null;
    });
    if (_pageController.hasClients) {
      _pageController.animateToPage(
        page,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
      );
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_pageController.hasClients) {
          _pageController.jumpToPage(page);
        }
      });
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _goToPage(_currentStep - 1);
    }
  }

  /// Hay información capturada que se perdería al salir o reiniciar.
  bool get _hasProgress =>
      _vinController.text.trim().isNotEmpty ||
      _decodedVehicle != null ||
      _selectedCandidate != null ||
      _calculatedOutput != null ||
      _selectedCliente != null;

  /// Texto de contexto en el AppBar para que siempre se sepa qué se cotiza.
  String _wizardContextLabel() {
    final vehicle = _decodedVehicle;
    if (vehicle != null) {
      final parts = <String>[
        if ((vehicle.make ?? '').trim().isNotEmpty) vehicle.make!.trim(),
        if ((vehicle.model ?? '').trim().isNotEmpty) vehicle.model!.trim(),
        if (vehicle.modelYear != null) '${vehicle.modelYear}',
      ];
      if (parts.isNotEmpty) return parts.join(' · ');
      return vehicle.vin;
    }
    final vin = _vinController.text.trim();
    if (vin.isNotEmpty) return 'VIN $vin';
    return 'Paso ${_currentStep + 1} de 4';
  }

  Future<bool> _confirmDiscard({
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Volver'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  /// Sale del wizard por completo (descarta la cotización en curso).
  Future<void> _cancelWizard() async {
    if (_hasProgress) {
      final shouldExit = await _confirmDiscard(
        title: '¿Cancelar cotización?',
        message:
            'Se descartará la información capturada y volverás al listado.',
        confirmLabel: 'Sí, cancelar',
      );
      if (!shouldExit) return;
    }
    if (mounted) Navigator.of(context).pop();
  }

  /// Limpia todo y regresa al paso del VIN. Con [scan] abre la cámara para
  /// capturar otro vehículo de inmediato ("buscar otro").
  Future<void> _resetWizard({bool scan = false}) async {
    if (_hasProgress) {
      final shouldReset = await _confirmDiscard(
        title: scan ? '¿Buscar otro vehículo?' : '¿Reiniciar cotización?',
        message: 'Se borrarán los datos capturados y volverás al paso del VIN.',
        confirmLabel: scan ? 'Buscar otro' : 'Reiniciar',
      );
      if (!shouldReset) return;
    }

    setState(() {
      _wizardEpoch++;
      _currentStep = 0;
      _loading = false;
      _errorMessage = null;
      _vinController.clear();
      _decodedVehicle = null;
      _candidatesOutput = null;
      _selectedCandidate = null;
      _valorAduanaController.clear();
      _selectedTipoTramite = 'NORMAL';
      _selectedCategoriaAmparo = 'NORMAL';
      _tipoCambioAplicadoController.clear();
      _honorariosController.clear();
      _tipoCambio = null;
      _selectedTcContexto = 'FIX';
      _calculatedOutput = null;
      _showFiscalOptions = false;
      _selectedCliente = null;
      _notasController.clear();
    });
    _goToPage(0);

    if (scan) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _scanVin();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_hasProgress,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _cancelWizard();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.ink,
          titleSpacing: 0,
          leading: IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Cancelar cotización',
            onPressed: _cancelWizard,
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Nueva Cotización',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
              ),
              Text(
                _wizardContextLabel(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.ink3,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Más opciones',
              icon: const Icon(Icons.more_vert),
              onSelected: (value) {
                switch (value) {
                  case 'scan':
                    _resetWizard(scan: true);
                    break;
                  case 'reset':
                    _resetWizard();
                    break;
                  case 'cancel':
                    _cancelWizard();
                    break;
                }
              },
              itemBuilder: (menuContext) => const [
                PopupMenuItem(
                  value: 'scan',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.qr_code_scanner_outlined),
                    title: Text('Buscar otro VIN'),
                  ),
                ),
                PopupMenuItem(
                  value: 'reset',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.restart_alt),
                    title: Text('Reiniciar cotización'),
                  ),
                ),
                PopupMenuDivider(),
                PopupMenuItem(
                  value: 'cancel',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.close, color: AppColors.danger),
                    title: Text(
                      'Cancelar y salir',
                      style: TextStyle(color: AppColors.danger),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        body: Stack(
          children: [
            Column(
              children: [
                _buildProgressBar(),
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_errorMessage != null) _buildError(),
                            _buildStep0(),
                          ],
                        ),
                      ),
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_errorMessage != null) _buildError(),
                            _buildStep1(),
                          ],
                        ),
                      ),
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_errorMessage != null) _buildError(),
                            _buildStep2(),
                          ],
                        ),
                      ),
                      SingleChildScrollView(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_errorMessage != null) _buildError(),
                            _buildStep3(),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (_loading)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withValues(alpha: 0.15),
                  child: const Center(
                    child: CircularProgressIndicator(color: AppColors.red),
                  ),
                ),
              ),
          ],
        ),
        bottomNavigationBar: _buildBottomActionBar(),
      ),
    );
  }

  Widget _buildProgressBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: List.generate(4, (index) {
          final labels = ['VIN', 'Valor', 'Cálculo', 'Revisar'];
          final enabled = _canOpenStep(index);
          final completed = _isStepComplete(index);
          return Expanded(
            child: _FlowStepItem(
              number: index + 1,
              label: labels[index],
              active: _currentStep == index,
              completed: completed,
              enabled: enabled,
              showConnector: index < 3,
              onTap: enabled ? () => _openStepFromChip(index) : null,
            ),
          );
        }),
      ),
    );
  }

  bool _canOpenStep(int step) {
    return switch (step) {
      0 => true,
      1 => _decodedVehicle != null,
      2 =>
        _decodedVehicle != null &&
            (_selectedCandidate != null ||
                _valorAduanaController.text.trim().isNotEmpty),
      3 => _calculatedOutput != null,
      _ => false,
    };
  }

  bool _isStepComplete(int step) {
    return switch (step) {
      0 => _decodedVehicle != null,
      1 =>
        _selectedCandidate != null ||
            _valorAduanaController.text.trim().isNotEmpty,
      2 => _calculatedOutput != null,
      3 => _selectedCliente != null,
      _ => false,
    };
  }

  void _openStepFromChip(int step) {
    if (!_canOpenStep(step)) return;
    if (step == 2 && _tipoCambio == null) {
      _fetchTipoCambioAndRates();
    }
    _goToPage(step);
  }

  String _stepActionLabel() {
    return switch (_currentStep) {
      0 => 'Decodificar VIN',
      1 => 'Usar este valor',
      2 => 'Calcular total',
      3 => 'Guardar cotización',
      _ => 'Continuar',
    };
  }

  String _stepHelperLabel() {
    if (_calculatedOutput != null) {
      return 'Total estimado';
    }
    if (_selectedCandidate != null) {
      return 'Valor aduana';
    }
    if (_decodedVehicle != null) {
      return 'Vehículo listo';
    }
    return 'Pendiente';
  }

  String _bottomAmountLabel() {
    final currency = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    final calc = _calculatedOutput;
    if (calc != null) {
      return '${currency.format(calc.total)} MXN';
    }
    final candidate = _selectedCandidate;
    if (candidate != null) {
      return '\$${NumberFormat('#,##0.00').format(candidate.precioUsd)} USD';
    }
    final vehicle = _decodedVehicle;
    if (vehicle != null) {
      return '${vehicle.make ?? 'Marca'} ${vehicle.model ?? 'Modelo'}';
    }
    return 'Sin calcular';
  }

  bool _canRunCurrentAction() {
    return switch (_currentStep) {
      0 => _vinController.text.trim().length == 17,
      1 => (double.tryParse(_valorAduanaController.text) ?? 0) > 0,
      2 => _decodedVehicle != null,
      3 => _selectedCliente != null,
      _ => false,
    };
  }

  Widget _buildBottomActionBar() {
    return AbsorbPointer(
      absorbing: _loading,
      child: Opacity(
        opacity: _loading ? 0.6 : 1.0,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 22),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            children: [
              if (_currentStep > 0) ...[
                SizedBox(
                  width: 52,
                  height: 52,
                  child: OutlinedButton(
                    onPressed: _previousStep,
                    style: OutlinedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                    child: const Icon(Icons.arrow_back, color: AppColors.ink2),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _stepHelperLabel(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.ink3,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _bottomAmountLabel(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 158,
                child: FilledButton(
                  onPressed: _canRunCurrentAction() ? _nextStepAction : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    textStyle: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                    ),
                  ),
                  child: Text(
                    _stepActionLabel(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.redSoft,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
      ),
      child: Text(
        _errorMessage!,
        style: const TextStyle(color: AppColors.danger, fontSize: 13),
      ),
    );
  }

  void _nextStepAction() {
    switch (_currentStep) {
      case 0:
        _decodeVin();
        break;
      case 1:
        _goToPage(2);
        _fetchTipoCambioAndRates();
        break;
      case 2:
        _calculateTaxes();
        break;
      case 3:
        _saveCotizacion();
        break;
    }
  }

  Widget _buildStep0() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '¿Qué vehículo vas a cotizar?',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Escanea el VIN o escríbelo. Al continuar buscaremos el vehículo y su valor en el catálogo del SAT.',
          style: TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _vinController,
          onChanged: (_) {
            setState(() {
              _decodedVehicle = null;
              _candidatesOutput = null;
              _selectedCandidate = null;
              _calculatedOutput = null;
              _errorMessage = null;
            });
          },
          maxLength: 17,
          maxLengthEnforcement:
              MaxLengthEnforcement.truncateAfterCompositionEnds,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: 'VIN',
            hintText: 'Ej. 1FTFW1EF5CFA00000',
            counterText: '',
            helperText: '17 caracteres',
            prefixIcon: const Icon(Icons.pin_outlined, size: 20),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.red, width: 2),
            ),
          ),
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: 16,
            letterSpacing: 2,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _scanVin,
          icon: const Icon(Icons.document_scanner_outlined),
          label: const Text('Escanear VIN'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.red,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(54),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(height: 18),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline, size: 19, color: AppColors.ink2),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Puedes revisar los datos antes de calcular. El escaneo no guarda fotografías.',
                  style: TextStyle(
                    color: AppColors.ink2,
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep1() {
    final vehicle = _decodedVehicle;
    if (vehicle == null) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Selecciona el valor aduana',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Compara las coincidencias del Anexo 2 y toca la que corresponde al vehículo.',
          style: TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: AppColors.redSoft,
                    foregroundColor: AppColors.red,
                    radius: 20,
                    child: Icon(Icons.directions_car_filled_outlined, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${vehicle.make ?? 'Marca sin especificar'} ${vehicle.model ?? 'Modelo sin especificar'}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Año: ${vehicle.modelYear ?? 'N/A'} · Planta: ${vehicle.plantCountry ?? 'N/A'}',
                          style: const TextStyle(
                            color: AppColors.ink2,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildSummaryInfoItem(
                    'Cilindros',
                    vehicle.engineCylinders?.toString() ?? 'N/A',
                  ),
                  _buildSummaryInfoItem(
                    'Cilindrada',
                    vehicle.displacementCC != null
                        ? '${(vehicle.displacementCC! / 1000).toStringAsFixed(1)}L'
                        : 'N/A',
                  ),
                  _buildSummaryInfoItem(
                    'Tipo Vehículo',
                    vehicle.vehicleType?.toString() ?? 'N/A',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        if (_candidatesOutput != null &&
            _candidatesOutput!.candidatos.isNotEmpty) ...[
          const Text(
            'Coincidencias en Catálogo SAT',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: AppColors.ink2,
            ),
          ),
          const SizedBox(height: 10),
          ..._candidatesOutput!.candidatos.map((cand) {
            final isSelected =
                _selectedCandidate?.precioEstimadoId == cand.precioEstimadoId;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadius.md),
                boxShadow: isSelected ? AppShadows.soft : null,
              ),
              child: Card(
                margin: EdgeInsets.zero,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  side: BorderSide(
                    color: isSelected ? AppColors.red : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  onTap: () {
                    setState(() {
                      _selectedCandidate = cand;
                      _valorAduanaController.text = cand.precioUsd.toString();
                      _calculatedOutput = null;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${cand.marcaTextoCatalogo} ${cand.modeloCatalogo}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Fracción: ${cand.fraccion} · Hoja: ${cand.hojaOrigen}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.ink2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '\$${NumberFormat('#,##0.00').format(cand.precioUsd)} USD',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                                color: isSelected
                                    ? AppColors.red
                                    : AppColors.ink,
                                fontFeatures: const [
                                  FontFeature.tabularFigures(),
                                ],
                              ),
                            ),
                            if (cand.esSugerido)
                              Container(
                                margin: const EdgeInsets.only(top: 6),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.successSoft,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Sugerido',
                                  style: TextStyle(
                                    color: AppColors.success,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ] else ...[
          const Text(
            'Sin Coincidencias en Anexo 2 del SAT',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppColors.danger,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'No encontramos coincidencias automáticas en el catálogo. Deberás ingresar el valor estimado de aduana manualmente.',
            style: TextStyle(color: AppColors.ink3, fontSize: 12),
          ),
        ],
        const SizedBox(height: 24),
        TextField(
          controller: _valorAduanaController,
          onChanged: (_) {
            setState(() {
              _selectedCandidate = null;
              _calculatedOutput = null;
              _errorMessage = null;
            });
          },
          decoration: InputDecoration(
            labelText: 'Valor en Aduana (USD)',
            hintText: 'Ej. 8500.00',
            prefixText: '\$ ',
            suffixText: ' USD',
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.red, width: 2),
            ),
          ),
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 15,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
      ],
    );
  }

  Widget _buildSummaryInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.ink3,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.ink,
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Confirma el cálculo',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const Text(
          'El régimen fiscal se determina por el año modelo. Sólo elige si el servicio será normal o express.',
          style: TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.account_balance_outlined,
                color: AppColors.ink2,
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Régimen fiscal detectado',
                      style: TextStyle(
                        color: AppColors.ink3,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _detectedFiscalRegimeLabel,
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${_decodedVehicle?.modelYear ?? ''}',
                style: const TextStyle(
                  color: AppColors.ink2,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'TIPO DE SERVICIO',
          style: TextStyle(
            color: AppColors.ink2,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        _buildSegmentedControl(),
        if (_detectedFiscalRegime == 'AMPARO') ...[
          const SizedBox(height: 18),
          const Text(
            '¿Qué categoría de amparo corresponde?',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: AppColors.ink2,
            ),
          ),
          const SizedBox(height: 8),
          _buildAmparoSegmentedControl(),
        ],
        const SizedBox(height: 24),
        _buildSectionTitle('TIPO DE CAMBIO'),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Fuente oficial',
                    style: TextStyle(color: AppColors.ink2, fontSize: 13),
                  ),
                  DropdownButton<String>(
                    value: _selectedTcContexto,
                    underline: const SizedBox(),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.red,
                      fontSize: 13,
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'FIX',
                        child: Text('Banxico FIX'),
                      ),
                      DropdownMenuItem(
                        value: 'DOF',
                        child: Text('Diario Oficial (DOF)'),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedTcContexto = val;
                          _calculatedOutput = null;
                        });
                        _fetchTipoCambioAndRates();
                      }
                    },
                  ),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Referencia oficial',
                    style: TextStyle(color: AppColors.ink2, fontSize: 13),
                  ),
                  Text(
                    _tipoCambio != null
                        ? '\$${_tipoCambio!.tipoCambio.toStringAsFixed(4)} MXN'
                        : 'Cargando...',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      color: AppColors.ink,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _tipoCambioAplicadoController,
                onChanged: (_) => setState(() => _calculatedOutput = null),
                decoration: InputDecoration(
                  labelText: 'Tipo de cambio aplicado',
                  hintText: 'Ej. 18.5000',
                  prefixText: '\$ ',
                  suffixText: ' MXN',
                  helperText: 'Puedes escribir el tipo de cambio que usarás.',
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    borderSide: const BorderSide(
                      color: AppColors.red,
                      width: 2,
                    ),
                  ),
                ),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: () {
            setState(() => _showFiscalOptions = !_showFiscalOptions);
          },
          style: TextButton.styleFrom(
            foregroundColor: AppColors.ink2,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
          ),
          icon: Icon(
            _showFiscalOptions ? Icons.keyboard_arrow_up : Icons.tune_outlined,
          ),
          label: Text(
            _showFiscalOptions
                ? 'Ocultar ajustes opcionales'
                : 'Ajustes opcionales',
          ),
        ),
        if (_showFiscalOptions) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _honorariosController,
            onChanged: (_) => setState(() => _calculatedOutput = null),
            decoration: InputDecoration(
              labelText: 'Honorarios de agencia',
              hintText: 'Se usará el monto predeterminado si queda vacío',
              prefixText: '\$ ',
              suffixText: ' MXN',
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AppRadius.md),
                borderSide: const BorderSide(color: AppColors.red, width: 2),
              ),
            ),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
        ],
      ],
    );
  }

  Widget _buildSegmentedControl() {
    const options = [
      (
        value: 'NORMAL',
        title: 'Normal',
        description: 'Sin cargo adicional por prioridad.',
        icon: Icons.receipt_long_outlined,
      ),
      (
        value: 'EXPRESS',
        title: 'Express',
        description: 'Agrega \$2,000 MXN por servicio express.',
        icon: Icons.bolt_outlined,
      ),
    ];

    return Column(
      children: options.map((option) {
        final selected = _selectedTipoTramite == option.value;
        return Padding(
          padding: const EdgeInsets.only(bottom: 9),
          child: Material(
            color: selected ? AppColors.redSoft : AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedTipoTramite = option.value;
                  _calculatedOutput = null;
                });
              },
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: selected ? AppColors.red : AppColors.border,
                    width: selected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      option.icon,
                      color: selected ? AppColors.red : AppColors.ink2,
                      size: 23,
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            option.title,
                            style: const TextStyle(
                              color: AppColors.ink,
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            option.description,
                            style: const TextStyle(
                              color: AppColors.ink2,
                              fontSize: 12,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      selected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: selected ? AppColors.red : AppColors.ink3,
                      size: 22,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAmparoSegmentedControl() {
    const options = [
      (
        value: 'NORMAL',
        title: 'Normal',
        description: 'Tabulador estándar de amparo.',
      ),
      (
        value: 'LUJO',
        title: 'Lujo',
        description: 'Selección manual para el tabulador de lujo.',
      ),
    ];

    return Row(
      children: List.generate(options.length, (index) {
        final option = options[index];
        final selected = _selectedCategoriaAmparo == option.value;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: index == 0 ? 8 : 0),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedCategoriaAmparo = option.value;
                  _calculatedOutput = null;
                });
              },
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                constraints: const BoxConstraints(minHeight: 88),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: selected ? AppColors.redSoft : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: selected ? AppColors.red : AppColors.border,
                    width: selected ? 2 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            option.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Icon(
                          selected
                              ? Icons.check_circle
                              : Icons.radio_button_unchecked,
                          color: selected ? AppColors.red : AppColors.ink3,
                          size: 19,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      option.description,
                      style: const TextStyle(
                        color: AppColors.ink2,
                        fontSize: 11,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildClientSelector() {
    final selected = _selectedCliente;

    return LayoutBuilder(
      builder: (context, constraints) {
        final fieldWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth.clamp(280.0, 520.0).toDouble()
            : 520.0;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'CLIENTE',
              style: TextStyle(
                color: AppColors.ink2,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Autocomplete<ClienteListDto>(
              key: ValueKey('cliente-$_wizardEpoch-$_clientSearchEpoch'),
              optionsBuilder: (TextEditingValue textEditingValue) async {
                final query = textEditingValue.text.trim();
                if (query.length < 2) {
                  return const Iterable<ClienteListDto>.empty();
                }
                try {
                  return await ref
                      .read(adminApiProvider)
                      .searchClientesAutocomplete(query);
                } catch (_) {
                  return const Iterable<ClienteListDto>.empty();
                }
              },
              displayStringForOption: _clientDisplayName,
              onSelected: (option) {
                FocusScope.of(context).unfocus();
                setState(() => _selectedCliente = option);
              },
              fieldViewBuilder:
                  (context, controller, focusNode, onFieldSubmitted) {
                    return TextField(
                      controller: controller,
                      focusNode: focusNode,
                      onChanged: (_) {
                        if (_selectedCliente != null) {
                          setState(() => _selectedCliente = null);
                        }
                      },
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        labelText: 'Buscar cliente',
                        hintText: 'Nombre, apodo, teléfono o email',
                        helperText: 'Escribe al menos 2 caracteres.',
                        prefixIcon: const Icon(Icons.person_search_outlined),
                        suffixIcon: selected == null
                            ? null
                            : IconButton(
                                tooltip: 'Cambiar cliente',
                                onPressed: () {
                                  controller.clear();
                                  focusNode.requestFocus();
                                  setState(() => _selectedCliente = null);
                                },
                                icon: const Icon(Icons.close),
                              ),
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          borderSide: const BorderSide(
                            color: AppColors.red,
                            width: 2,
                          ),
                        ),
                      ),
                    );
                  },
              optionsViewBuilder: (context, onSelected, options) {
                final items = options.toList();
                return Align(
                  alignment: Alignment.topLeft,
                  child: Material(
                    color: AppColors.surface,
                    elevation: 10,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    clipBehavior: Clip.antiAlias,
                    child: SizedBox(
                      width: fieldWidth,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 320),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          shrinkWrap: true,
                          itemCount: items.length,
                          separatorBuilder: (_, _) =>
                              const Divider(height: 1, color: AppColors.border),
                          itemBuilder: (context, index) {
                            final option = items[index];
                            final highlighted =
                                AutocompleteHighlightedOption.of(context) ==
                                index;
                            return _ClientOptionTile(
                              client: option,
                              highlighted: highlighted,
                              onTap: () => onSelected(option),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              child: selected == null
                  ? const SizedBox(height: 12)
                  : Padding(
                      key: ValueKey(selected.id),
                      padding: const EdgeInsets.only(top: 12),
                      child: _SelectedClientPanel(
                        client: selected,
                        onClear: () {
                          setState(() {
                            _selectedCliente = null;
                            _clientSearchEpoch++;
                          });
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }

  String _clientDisplayName(ClienteListDto client) {
    final name = client.nombreCompleto?.trim();
    if (name == null || name.isEmpty || name == client.apodo) {
      return client.apodo;
    }
    return '$name (${client.apodo})';
  }

  Widget _buildStep3() {
    final calc = _calculatedOutput;
    if (calc == null) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Revisa el total',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Confirma cómo se forma la cotización antes de asignar el cliente.',
          style: TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 16),
        _TaxBreakdown(calc: calc),
        const SizedBox(height: 24),
        _buildClientSelector(),
        const SizedBox(height: 24),
        TextField(
          controller: _notasController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Notas adicionales (Se imprimen en el PDF)',
            hintText: 'Ej. No incluye grúa...',
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.red, width: 2),
            ),
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: AppColors.ink2,
        letterSpacing: 0.5,
      ),
    );
  }
}

class _FlowStepItem extends StatelessWidget {
  const _FlowStepItem({
    required this.number,
    required this.label,
    required this.active,
    required this.completed,
    required this.enabled,
    required this.showConnector,
    required this.onTap,
  });

  final int number;
  final String label;
  final bool active;
  final bool completed;
  final bool enabled;
  final bool showConnector;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = active || completed
        ? AppColors.red
        : enabled
        ? AppColors.ink2
        : AppColors.ink3;
    final circleColor = active
        ? AppColors.red
        : completed
        ? AppColors.redSoft
        : AppColors.surface;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 1,
                      color: number == 1
                          ? Colors.transparent
                          : completed || active
                          ? AppColors.red
                          : AppColors.border,
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 27,
                    height: 27,
                    decoration: BoxDecoration(
                      color: circleColor,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: active || completed
                            ? AppColors.red
                            : AppColors.border,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: completed
                        ? const Icon(
                            Icons.check,
                            size: 16,
                            color: AppColors.red,
                          )
                        : Text(
                            '$number',
                            style: TextStyle(
                              color: active ? AppColors.surface : foreground,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                  ),
                  Expanded(
                    child: Container(
                      height: 1,
                      color: showConnector
                          ? completed
                                ? AppColors.red
                                : AppColors.border
                          : Colors.transparent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: foreground,
                  fontSize: 10,
                  fontWeight: active ? FontWeight.w900 : FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientOptionTile extends StatelessWidget {
  const _ClientOptionTile({
    required this.client,
    required this.highlighted,
    required this.onTap,
  });

  final ClienteListDto client;
  final bool highlighted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = _clientName(client);
    final contact = _clientContact(client);

    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        color: highlighted ? AppColors.redSoft : AppColors.surface,
        child: Row(
          children: [
            _ClientAvatar(label: client.apodo),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    client.apodo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.ink,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.ink2,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (contact != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      contact,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.ink3,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${client.totalTramites} trámites',
                  style: const TextStyle(
                    color: AppColors.ink2,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${client.totalVehiculos} vehículos',
                  style: const TextStyle(
                    color: AppColors.ink3,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectedClientPanel extends StatelessWidget {
  const _SelectedClientPanel({required this.client, required this.onClear});

  final ClienteListDto client;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final contact = _clientContact(client) ?? 'Sin contacto registrado';
    final totalFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.successSoft,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.24)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  client.apodo,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _clientName(client),
                  style: const TextStyle(
                    color: AppColors.ink2,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    _ClientMetaChip(icon: Icons.phone_outlined, label: contact),
                    _ClientMetaChip(
                      icon: Icons.directions_car_outlined,
                      label: '${client.totalVehiculos} vehículos',
                    ),
                    _ClientMetaChip(
                      icon: Icons.receipt_long_outlined,
                      label: totalFormat.format(client.totalFacturado),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Cambiar cliente',
            onPressed: onClear,
            icon: const Icon(Icons.close, color: AppColors.ink2),
          ),
        ],
      ),
    );
  }
}

class _ClientAvatar extends StatelessWidget {
  const _ClientAvatar({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final trimmed = label.trim();
    final initial = trimmed.isEmpty ? '?' : trimmed[0].toUpperCase();
    return CircleAvatar(
      radius: 20,
      backgroundColor: AppColors.redSoft,
      child: Text(
        initial,
        style: const TextStyle(
          color: AppColors.red,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _ClientMetaChip extends StatelessWidget {
  const _ClientMetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.ink2),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.ink2,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _clientName(ClienteListDto client) {
  final name = client.nombreCompleto?.trim();
  if (name == null || name.isEmpty) return client.apodo;
  return name;
}

String? _clientContact(ClienteListDto client) {
  final phone = client.telefono?.trim();
  if (phone != null && phone.isNotEmpty) return phone;
  final email = client.email?.trim();
  if (email != null && email.isNotEmpty) return email;
  return null;
}

class _TaxBreakdown extends StatelessWidget {
  const _TaxBreakdown({required this.calc});

  final CotizacionOutput calc;

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');
    final usdFormat = NumberFormat.currency(locale: 'en_US', symbol: '\$');
    final isAmparo = calc.regimenFiscal == 'AMPARO';
    final servicesTotal = calc.honorarios + calc.cargoExpress;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'TOTAL COTIZADO',
              style: TextStyle(
                color: AppColors.ink3,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                '${currencyFormat.format(calc.total)} MXN',
                style: const TextStyle(
                  color: AppColors.ink,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                _SummaryTag(
                  icon: Icons.account_balance_outlined,
                  label: _regimeLabel(calc.regimenFiscal),
                ),
                _SummaryTag(
                  icon: Icons.description_outlined,
                  label: calc.fraccion,
                ),
              ],
            ),
            const Divider(height: 32),
            Text(
              isAmparo ? 'PRECIO DE AMPARO' : 'BASE DEL CÁLCULO',
              style: const TextStyle(
                color: AppColors.ink2,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            if (!isAmparo) ...[
              _TaxRow(
                label: 'Valor aduana',
                value: '${usdFormat.format(calc.valorAduanaUsd ?? 0)} USD',
              ),
              _TaxRow(
                label: 'Tipo de cambio aplicado',
                value:
                    '\$${NumberFormat('#,##0.0000').format(calc.tipoCambioAplicado ?? 0)}',
              ),
              _TaxRow(
                label: 'Valor fiscal en pesos',
                value: currencyFormat.format(calc.valorPesos),
                emphasized: true,
              ),
            ] else ...[
              _TaxRow(
                label: 'Precio de tabulador',
                value: currencyFormat.format(calc.valorPesos),
                emphasized: true,
              ),
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'El precio de amparo es todo incluido; por eso IGI, DTA e IVA no aparecen como partidas separadas.',
                  style: TextStyle(
                    color: AppColors.ink2,
                    fontSize: 11,
                    height: 1.35,
                  ),
                ),
              ),
            ],
            const Divider(height: 28),
            const Text(
              'IMPUESTOS Y DERECHOS',
              style: TextStyle(
                color: AppColors.ink2,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            if (!isAmparo) ...[
              _TaxRow(
                label:
                    'IGI (${(calc.igiPorcentaje * 100).toStringAsFixed(0)}%)',
                value: currencyFormat.format(calc.igi),
              ),
              _TaxRow(label: 'DTA', value: currencyFormat.format(calc.dta)),
              _TaxRow(label: 'IVA', value: currencyFormat.format(calc.iva)),
              if (calc.prev > 0)
                _TaxRow(label: 'PREV', value: currencyFormat.format(calc.prev)),
              if (calc.prv > 0)
                _TaxRow(label: 'PRV', value: currencyFormat.format(calc.prv)),
            ],
            _TaxRow(
              label: isAmparo ? 'Amparo todo incluido' : 'Subtotal impuestos',
              value: currencyFormat.format(calc.impuestosTotal),
              emphasized: true,
            ),
            const Divider(height: 28),
            const Text(
              'SERVICIOS',
              style: TextStyle(
                color: AppColors.ink2,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            _TaxRow(
              label: 'Honorarios',
              value: currencyFormat.format(calc.honorarios),
            ),
            if (calc.cargoExpress > 0)
              _TaxRow(
                label: 'Cargo express',
                value: currencyFormat.format(calc.cargoExpress),
              ),
            _TaxRow(
              label: 'Subtotal servicios',
              value: currencyFormat.format(servicesTotal),
              emphasized: true,
            ),
          ],
        ),
      ),
    );
  }

  String _regimeLabel(String regime) {
    return switch (regime) {
      'AMPARO' => 'Amparo',
      'POST_2017' => '2017 o posterior',
      'PRE_2016' => '2016 o anterior',
      _ => regime,
    };
  }
}

class _SummaryTag extends StatelessWidget {
  const _SummaryTag({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.ink2),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.ink2,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _TaxRow extends StatelessWidget {
  const _TaxRow({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: emphasized ? AppColors.ink : AppColors.ink2,
                fontSize: 12,
                fontWeight: emphasized ? FontWeight.w800 : FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            value,
            style: TextStyle(
              fontWeight: emphasized ? FontWeight.w900 : FontWeight.w700,
              color: AppColors.ink,
              fontSize: 12,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
