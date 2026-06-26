import 'package:flutter/material.dart';

import 'ajustes_page.dart';
import 'campo_tasks_page.dart';
import 'historial_page.dart';
import 'incidencias_page.dart';
import 'registro_page.dart';

/// Contenedor con nav inferior (Tareas / Historial / Incidencias / Ajustes).
/// La captura se abre como ruta full-screen encima de este shell.
class CampoShellPage extends StatefulWidget {
  const CampoShellPage({super.key});

  @override
  State<CampoShellPage> createState() => _CampoShellPageState();
}

class _CampoShellPageState extends State<CampoShellPage> {
  int _index = 0;

  static const _tabs = [
    CampoTasksPage(),
    HistorialPage(),
    IncidenciasPage(),
    AjustesPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      floatingActionButton: _index == 0
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.of(
                context,
              ).push(MaterialPageRoute(builder: (_) => const RegistroPage())),
              icon: const Icon(Icons.add),
              label: const Text('Registrar'),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Tareas',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'Historial',
          ),
          NavigationDestination(
            icon: Icon(Icons.warning_amber_outlined),
            selectedIcon: Icon(Icons.warning_amber_rounded),
            label: 'Incidencias',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }
}
