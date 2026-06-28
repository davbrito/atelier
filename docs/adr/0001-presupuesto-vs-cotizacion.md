# Separar Presupuesto (plantilla reusable) de Cotización (instancia congelada)

Se decidió modelar dos entidades distintas — Presupuesto y Cotización — en lugar de una sola entidad con un flag que indique si está "congelada" o no.

## Por qué

Una sola entidad con un flag `frozen` obligaría a que ambos casos compartan el mismo schema, forzando compromisos incómodos:

- Un Presupuesto **referencia** precios vivos del catálogo; una Cotización **copia** los precios al momento de crearse. En una sola tabla, tendrías columnas que solo aplican a un caso (`frozen_price`, `frozen_hourly_rate`, `client_title`), dejando nulos en el otro.
- La Cotización es **inmutable**; el Presupuesto se **edita**. Con una sola tabla, necesitarías lógica condicional para decidir qué campos son editables según el flag.
- Las cotizaciones se generan *a partir de* un Presupuesto. Modelarlo como entidades separadas con una FK (`cotizacion.presupuesto_id`) expresa esa relación de forma natural.

Alternativa considerada: una sola tabla `quote` con `is_template: boolean` y campos condicionales. Se descartó porque mezcla dos conceptos del dominio que el glosario ya separa claramente, y obliga a validaciones condicionales dispersas por el código.
