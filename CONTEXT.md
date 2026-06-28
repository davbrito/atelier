# Cotizador de Modistería

Aplicación para calcular presupuestos y cotizaciones de trabajos de modistería y costura.

## Language

**Material**:
Un insumo o materia prima usado en la confección. Tiene un nombre, una unidad de medida, y un precio actual en el catálogo. El precio de un material tiene historial de cambios.
_Avoid_: Insumo, producto, artículo

**Unidad de Medida**:
La unidad en que se mide y se cotiza un Material. Puede ser discreta (unidades para botones, cierres) o métrica (metros, centímetros para telas, hilo).
_Avoid_: UOM, medida

**Presupuesto**:
Una plantilla reusable que describe un tipo de prenda o trabajo. Contiene una lista de materiales con cantidades y una lista de operaciones de mano de obra con duraciones. Los precios se referencian en vivo del catálogo — no se congelan.
_Avoid_: Plantilla, preset, configuración, modelo

**Operación**:
Una tarea de mano de obra definida en un catálogo compartido (ej: cortar tela, coser, cortar patrones). Cada Presupuesto la usa con una duración específica en minutos.
_Avoid_: Tarea, bloque, paso, fase

**Tarifa Horaria**:
El costo por hora de la mano de obra. Es único y global — todas las operaciones se cobran a la misma tarifa.
_Avoid_: Precio por hora, rate

**Cotización**:
Una instancia congelada de un Presupuesto, generada para una referencia de cliente específica. Los precios de materiales y mano de obra se fijan al momento de crearla y no cambian. Es inmutable: si se necesitan cambios, se genera una nueva Cotización.
_Avoid_: Presupuesto final, quote, estimación

**Cliente**:
Referencia mínima en una Cotización — por ahora solo un campo de texto libre (título/nombre). No existe una entidad Cliente independiente.
_Avoid_: Comprador, clienta
