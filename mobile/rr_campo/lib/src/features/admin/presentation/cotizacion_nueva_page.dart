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
  bool _loading = false;
  String? _errorMessage;
  late final PageController _pageController;

  // â”€â”€ Step 0: VIN & Decode â”€â”€
  final _vinController = TextEditingController();
  VehicleDecodedDto? _decodedVehicle;

  // â”€â”€ Step 1: Candidates Anexo 2 â”€â”€
  CandidatosPrecioOutput? _candidatesOutput;
  CandidatoPrecio? _selectedCandidate;
  final _valorAduanaController = TextEditingController();

  // â”€â”€ Step 2: Fiscal & Type of Change â”€â”€
  String _selectedTipoTramite = 'REGULAR';
  String? _selectedCategoriaAmparo = 'NORMAL';
  final _tcMargenController = TextEditingController(text: '0.00');
  final _honorariosController = TextEditingController();
  TipoCambioDto? _tipoCambio;
  String _selectedTcContexto = 'FIX';
  CotizacionOutput? _calculatedOutput;

  // â”€â”€ Step 3: Client & Save â”€â”€
  ClienteListDto? _selectedCliente;
  final _notasController = TextEditingController();

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
    _tcMargenController.dispose();
    _honorariosController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _scanVin() async {
    final scannedVin = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const MlkitVinScannerPage()),
    );
    if (scannedVin != null && scannedVin.isNotEmpty) {
      setState(() {
        _vinController.text = scannedVin;
      });
      _decodeVin();
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
      final input = CotizacionInput(
        vin: vehicle.vin,
        marca: vehicle.make,
        modelo: vehicle.model,
        anno: vehicle.modelYear,
        cilindradaCm3: vehicle.displacementCC?.toInt(),
        tipoVehiculo: vehicle.vehicleType,
        tcMargen: double.tryParse(_tcMargenController.text) ?? 0.0,
        tipoTramite: _selectedTipoTramite,
      );

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

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final input = CotizacionInput(
        vin: vehicle.vin,
        marca: vehicle.make,
        modelo: vehicle.model,
        anno: vehicle.modelYear,
        cilindradaCm3: vehicle.displacementCC?.toInt(),
        tipoVehiculo: vehicle.vehicleType,
        valorAduanaUsdOverride: double.tryParse(_valorAduanaController.text),
        precioEstimadoIdOverride: _selectedCandidate?.precioEstimadoId,
        categoriaAmparoOverride: _selectedTipoTramite == 'AMPARO'
            ? _selectedCategoriaAmparo
            : null,
        tcMargen: double.tryParse(_tcMargenController.text) ?? 0.0,
        tipoTramite: _selectedTipoTramite,
        honorariosOverride: _honorariosController.text.trim().isEmpty
            ? null
            : double.tryParse(_honorariosController.text),
      );

      final output = await ref.read(adminApiProvider).calcularCotizacion(input);
      setState(() {
        _calculatedOutput = output;
      });
      _goToPage(3);
    } catch (e) {
      setState(() => _errorMessage = 'Error al calcular cotizaciÃ³n: $e');
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
      final input = CotizacionInput(
        vin: vehicle.vin,
        marca: vehicle.make,
        modelo: vehicle.model,
        anno: vehicle.modelYear,
        cilindradaCm3: vehicle.displacementCC?.toInt(),
        tipoVehiculo: vehicle.vehicleType,
        valorAduanaUsdOverride: double.tryParse(_valorAduanaController.text),
        precioEstimadoIdOverride: _selectedCandidate?.precioEstimadoId,
        categoriaAmparoOverride: _selectedTipoTramite == 'AMPARO'
            ? _selectedCategoriaAmparo
            : null,
        tcMargen: double.tryParse(_tcMargenController.text) ?? 0.0,
        tipoTramite: _selectedTipoTramite,
        honorariosOverride: _honorariosController.text.trim().isEmpty
            ? null
            : double.tryParse(_honorariosController.text),
      );

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
          const SnackBar(content: Text('CotizaciÃ³n guardada exitosamente')),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CotizacionDetailPage(cotizacionId: result.id!),
          ),
        );
      }
    } catch (e) {
      setState(() => _errorMessage = 'Error al guardar cotizaciÃ³n: $e');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Nueva CotizaciÃ³n',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.ink,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_currentStep > 0) {
              _previousStep();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
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
    );
  }

  Widget _buildProgressBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(4, (index) {
            final labels = ['VIN', 'Valor', 'Régimen', 'Cliente'];
            final icons = [
              Icons.qr_code_scanner,
              Icons.price_check_outlined,
              Icons.account_balance_outlined,
              Icons.person_search_outlined,
            ];
            final enabled = _canOpenStep(index);
            final completed = _isStepComplete(index);
            final active = _currentStep == index;
            return Padding(
              padding: EdgeInsets.only(right: index == 3 ? 0 : 8),
              child: _FlowStepChip(
                label: labels[index],
                icon: completed ? Icons.check_circle : icons[index],
                active: active,
                completed: completed,
                enabled: enabled,
                onTap: enabled ? () => _openStepFromChip(index) : null,
              ),
            );
          }),
        ),
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
                  onPressed: _nextStepAction,
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
          'Identifica el VehÃ­culo',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Ingresa el nÃºmero de identificaciÃ³n vehicular (VIN) de 17 caracteres para decodificarlo automÃ¡ticamente.',
          style: TextStyle(color: AppColors.ink2, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          height: 180,
          decoration: BoxDecoration(
            color: AppColors.ink.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              const ClipRRect(
                borderRadius: BorderRadius.all(Radius.circular(18)),
                child: _ScannerBeam(),
              ),
              Positioned(
                top: 20,
                left: 20,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppColors.purple, width: 3),
                      left: BorderSide(color: AppColors.purple, width: 3),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 20,
                right: 20,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppColors.purple, width: 3),
                      right: BorderSide(color: AppColors.purple, width: 3),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                left: 20,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: AppColors.purple, width: 3),
                      left: BorderSide(color: AppColors.purple, width: 3),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                right: 20,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: AppColors.purple, width: 3),
                      right: BorderSide(color: AppColors.purple, width: 3),
                    ),
                  ),
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.qr_code_scanner,
                    size: 40,
                    color: AppColors.purple.withValues(alpha: 0.8),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Listo para escanear',
                    style: TextStyle(
                      color: AppColors.purple.withValues(alpha: 0.8),
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: _scanVin,
          icon: const Icon(Icons.camera_alt_outlined),
          label: const Text('Escanear VIN por CÃ¡mara'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.purple,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(height: 24),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'O INGRESA MANUALMENTE',
                style: TextStyle(
                  color: AppColors.ink3,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 20),
        TextField(
          controller: _vinController,
          maxLength: 17,
          maxLengthEnforcement:
              MaxLengthEnforcement.truncateAfterCompositionEnds,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: 'NÃºmero VIN (17 caracteres)',
            hintText: 'Ej. 1FTFW1EF5CFA00000',
            counterText: '',
            prefixIcon: const Icon(Icons.pin, size: 20),
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
          'Validar Datos del SAT (Anexo 2)',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.soft,
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
                          'AÃ±o: ${vehicle.modelYear ?? 'N/A'} Â· Planta: ${vehicle.plantCountry ?? 'N/A'}',
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
                    'Tipo VehÃ­culo',
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
            'Coincidencias en CatÃ¡logo SAT',
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
                    color: isSelected ? AppColors.purple : AppColors.border,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  onTap: () {
                    setState(() {
                      _selectedCandidate = cand;
                      _valorAduanaController.text = cand.precioUsd.toString();
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
                                'FracciÃ³n: ${cand.fraccion} Â· Hoja: ${cand.hojaOrigen}',
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
                                    ? AppColors.purple
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
            'No encontramos coincidencias automÃ¡ticas en el catÃ¡logo. DeberÃ¡s ingresar el valor estimado de aduana manualmente.',
            style: TextStyle(color: AppColors.ink3, fontSize: 12),
          ),
        ],
        const SizedBox(height: 24),
        TextField(
          controller: _valorAduanaController,
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
              borderSide: const BorderSide(color: AppColors.purple, width: 2),
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
          'ParÃ¡metros Fiscales',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Tipo de RÃ©gimen / TrÃ¡mite',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: AppColors.ink2,
          ),
        ),
        const SizedBox(height: 8),
        _buildSegmentedControl(),
        if (_selectedTipoTramite == 'AMPARO') ...[
          const SizedBox(height: 16),
          const Text(
            'CategorÃ­a de Amparo',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: AppColors.ink2,
            ),
          ),
          const SizedBox(height: 8),
          _buildAmparoSegmentedControl(),
        ],
        const SizedBox(height: 24),
        _buildSectionTitle('Tipo de Cambio Oficial (Banxico)'),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.soft,
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
                      color: AppColors.purple,
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
                        setState(() => _selectedTcContexto = val);
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
                    'Tipo de cambio hoy',
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
            ],
          ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _tcMargenController,
          decoration: InputDecoration(
            labelText: 'Margen de Riesgo sobre TC (\$ MXN)',
            hintText: '0.00',
            prefixText: '+ \$ ',
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
        const SizedBox(height: 20),
        TextField(
          controller: _honorariosController,
          decoration: InputDecoration(
            labelText: 'Honorarios Agencia (\$ MXN)',
            hintText: 'Opcional (predeterminado si queda vacÃ­o)',
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
    );
  }

  Widget _buildSegmentedControl() {
    final options = ['REGULAR', 'AMPARO', 'FRANJA'];
    final labels = ['REGULAR', 'AMPARO', 'FRANJA FRONTERIZA'];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: List.generate(options.length, (idx) {
          final isSelected = _selectedTipoTramite == options[idx];
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedTipoTramite = options[idx];
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  boxShadow: isSelected ? AppShadows.soft : null,
                ),
                child: Center(
                  child: Text(
                    labels[idx],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: isSelected ? AppColors.red : AppColors.ink2,
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildAmparoSegmentedControl() {
    final options = ['NORMAL', 'LUJO'];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: List.generate(options.length, (idx) {
          final isSelected = _selectedCategoriaAmparo == options[idx];
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedCategoriaAmparo = options[idx];
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  boxShadow: isSelected ? AppShadows.soft : null,
                ),
                child: Center(
                  child: Text(
                    options[idx],
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: isSelected ? AppColors.red : AppColors.ink2,
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStep3() {
    final calc = _calculatedOutput;
    if (calc == null) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ConfirmaciÃ³n y Cliente',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Selecciona el Cliente',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: AppColors.ink2,
          ),
        ),
        const SizedBox(height: 8),
        Autocomplete<ClienteListDto>(
          optionsBuilder: (TextEditingValue textEditingValue) async {
            if (textEditingValue.text.isEmpty) {
              return const Iterable<ClienteListDto>.empty();
            }
            try {
              return await ref
                  .read(adminApiProvider)
                  .searchClientesAutocomplete(textEditingValue.text);
            } catch (_) {
              return const Iterable<ClienteListDto>.empty();
            }
          },
          displayStringForOption: (option) =>
              '${option.nombreCompleto ?? option.apodo} (${option.apodo})',
          onSelected: (option) {
            setState(() => _selectedCliente = option);
          },
          fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
            return TextField(
              controller: controller,
              focusNode: focusNode,
              decoration: InputDecoration(
                hintText: 'Buscar por nombre o apodo...',
                prefixIcon: const Icon(Icons.person_search_outlined),
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
            );
          },
        ),
        if (_selectedCliente != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.successSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: AppColors.success.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle,
                  color: AppColors.success,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Cliente Seleccionado: ${_selectedCliente!.nombreCompleto ?? _selectedCliente!.apodo} (${_selectedCliente!.apodo})',
                    style: const TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        _TaxBreakdownAccordion(calc: calc),
        const SizedBox(height: 24),
        TextField(
          controller: _notasController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Notas adicionales (Se imprimen en el PDF)',
            hintText: 'Ej. No incluye grÃºa...',
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

class _ScannerBeam extends StatefulWidget {
  const _ScannerBeam();

  @override
  State<_ScannerBeam> createState() => _ScannerBeamState();
}

class _ScannerBeamState extends State<_ScannerBeam>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return CustomPaint(
          painter: _ScannerLinePainter(_controller.value),
          child: const SizedBox(height: 180, width: double.infinity),
        );
      },
    );
  }
}

class _FlowStepChip extends StatelessWidget {
  const _FlowStepChip({
    required this.label,
    required this.icon,
    required this.active,
    required this.completed,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final bool completed;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = active || completed
        ? AppColors.red
        : enabled
        ? AppColors.ink2
        : AppColors.ink3;
    final background = active
        ? AppColors.redSoft
        : completed
        ? AppColors.surface
        : AppColors.background;
    final border = active || completed ? AppColors.red : AppColors.border;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: border.withValues(alpha: enabled ? 1 : 0.6),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: foreground),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: foreground,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScannerLinePainter extends CustomPainter {
  _ScannerLinePainter(this.progress);
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          AppColors.purple.withValues(alpha: 0.0),
          AppColors.purple.withValues(alpha: 0.8),
          AppColors.purple.withValues(alpha: 0.0),
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final y = size.height * progress;
    canvas.drawRect(Rect.fromLTWH(0, y - 10, size.width, 20), paint);

    final linePaint = Paint()
      ..color = AppColors.purple
      ..strokeWidth = 2.0;
    canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
  }

  @override
  bool shouldRepaint(covariant _ScannerLinePainter oldDelegate) =>
      oldDelegate.progress != progress;
}

class _TaxBreakdownAccordion extends StatefulWidget {
  const _TaxBreakdownAccordion({required this.calc});
  final CotizacionOutput calc;

  @override
  State<_TaxBreakdownAccordion> createState() => _TaxBreakdownAccordionState();
}

class _TaxBreakdownAccordionState extends State<_TaxBreakdownAccordion> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final calc = widget.calc;
    final currencyFormat = NumberFormat.currency(locale: 'es_MX', symbol: '\$');

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.soft,
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Resumen del CÃ¡lculo de Impuestos',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                  ),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: AppColors.ink2,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
              child: Column(
                children: [
                  const Divider(height: 12),
                  _buildAccordionRow(
                    'Valor Aduana Usado',
                    '\$${NumberFormat('#,##0.00').format(calc.valorAduanaUsd ?? 0)} USD',
                  ),
                  _buildAccordionRow(
                    'Tipo Cambio Aplicado',
                    '\$${NumberFormat('#,##0.0000').format(calc.tipoCambioAplicado ?? 0)} MXN',
                  ),
                  _buildAccordionRow(
                    'Valor en Pesos',
                    currencyFormat.format(calc.valorPesos),
                  ),
                  const Divider(height: 20),
                  _buildAccordionRow(
                    'IGI / Arancel',
                    currencyFormat.format(calc.igi),
                  ),
                  _buildAccordionRow(
                    'Derecho TrÃ¡mite (DTA)',
                    currencyFormat.format(calc.dta),
                  ),
                  _buildAccordionRow('IVA', currencyFormat.format(calc.iva)),
                  _buildAccordionRow(
                    'Otros (PREV/PRV)',
                    currencyFormat.format(calc.prev + calc.prv),
                  ),
                  const Divider(height: 20),
                  _buildAccordionRow(
                    'Total Impuestos',
                    currencyFormat.format(calc.impuestosTotal),
                    isBold: true,
                  ),
                  _buildAccordionRow(
                    'Honorarios Agencia',
                    currencyFormat.format(calc.honorarios),
                  ),
                  _buildAccordionRow(
                    'Cargo Express',
                    currencyFormat.format(calc.cargoExpress),
                  ),
                ],
              ),
            ),
            crossFadeState: _expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 300),
          ),
        ],
      ),
    );
  }

  Widget _buildAccordionRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.ink2, fontSize: 13),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.w900 : FontWeight.bold,
              color: AppColors.ink,
              fontSize: 13,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
