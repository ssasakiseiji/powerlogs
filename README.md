# PowerLogs

![PowerLogs Logo](./public/logo.png)

**PowerLogs** es una aplicación web completa diseñada para el seguimiento detallado del entrenamiento en el gimnasio. Permite a los usuarios gestionar sus rutinas, registrar sus récords personales (PRs), y monitorear su progreso físico a lo largo del tiempo.

## Características Principales

* **Gestión de Rutinas:**
    * Crea y personaliza múltiples rutinas de entrenamiento.
    * Organiza las rutinas por días (ej: Día de Empuje, Día de Pierna).
    * Añade, edita, y reordena ejercicios dentro de cada día con una interfaz de arrastrar y soltar (drag and drop).
    * Duplica rutinas y días completos para una configuración rápida.

* **Seguimiento de Entrenamiento:**
    * Visualiza tu rutina activa y marca las series como completadas.
    * Registra el peso y las repeticiones de tus levantamientos para generar récords personales.
    * Monitorea el progreso semanal de tu rutina con una barra de progreso.

* **Récords Personales (PRs):**
    * Un dashboard dedicado para visualizar tus PRs en diferentes ejercicios.
    * Gráficos dinámicos que muestran la progresión de tu e1RM, peso levantado y volumen a lo largo del tiempo.
    * Marca tus ejercicios favoritos para un acceso rápido.
    * Filtros avanzados por grupo muscular, fecha, y más.

* **Seguimiento Corporal:**
    * Registra tu peso, porcentaje de grasa corporal y masa muscular.
    * Visualiza tu progreso con gráficos de evolución corporal.
    * Calcula automáticamente tu IMC (Índice de Masa Corporal).

* **Gestión de Datos:**
    * Define tus propios grupos musculares con colores personalizados.
    * Crea subcategorías para organizar mejor tus ejercicios.
    * Añade y edita tu propia base de datos de ejercicios, asignando metas y notas.

## Tecnologías Utilizadas

* **Frontend:**
    * React
    * Vite
    * Tailwind CSS
* **Backend y Base de Datos:**
    * Firebase (Firestore, Authentication)
* **Librerías Adicionales:**
    * Recharts para la visualización de datos.
    * dnd-kit para la funcionalidad de arrastrar y soltar.
