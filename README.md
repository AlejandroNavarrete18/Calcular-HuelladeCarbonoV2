# Calculadora de Huella de Carbono - UAS

Aplicación web que estima la huella de carbono individual a partir de un cuestionario (Hogar, Transporte, Alimentación y consumo). Las preguntas, opciones y pesos se leen de la base de datos, se puede editar sin tocar el codigo. Todo lo que captura la persona se guarda en la base y los resultados solo se entregan cuando el cuestionario y el formulario final están completos.

## Estructura del proyecto

```
Calcular-Huella-Carbono/
├── client/                      Interfaz web (React + Vite + Tailwind)
│   ├── .env.ejemplo             Variables de Vite (opcional)
│   ├── index.html
│   ├── vite.config.js           Proxy de /api hacia el servidor en desarrollo
│   ├── public/                  favicon.png
│   └── src/
│       ├── assets/images/       Logos de la UAS, Bienestar Universitario y la Facultad de Informática
│       ├── components/
│       │   ├── layout/          Header y Footer
│       │   ├── quiz/            Preguntas, barra de progreso e íconos
│       │   └── form/            Campos reutilizables del formulario
│       ├── screens/             Una pantalla por paso: Intro, Thanks, Quiz, Contact, Results
│       ├── admin/               Panel de administración (se descarga aparte, solo en /admin)
│       │   ├── components/      Layout, tablas, tarjetas, gráficas y ventanas
│       │   └── pages/           Resumen, participaciones, correo, administradores, bitácora y cuenta
│       ├── hooks/               useAppFlow, useQuiz, useParticipantForm, useCatalog, useRemoteData,
│       │                        useParticipationSubmit, useScreenTransition
│       ├── services/            httpClient, cuestionarioApi, catalogApi, participacionesApi
│       ├── styles/index.css     Tema y estilos globales
│       ├── constants.js         Pantallas y estados
│       ├── App.jsx
│       └── main.jsx
│
├── server/                      API (Express + MySQL + Nodemailer)
│   ├── .env.ejemplo             Variables de entorno del servidor (copiar a .env)
│   ├── assets/email/            Logos que se incrustan en el correo
│   ├── scripts/                 cifrar-contrasena.js (cifra la contraseña de Gmail) y crear-administrador.js
│   └── src/
│       ├── index.js             Arranque: configuración, base de datos, cuestionario, correo y Express
│       ├── app.js               Construcción de la aplicación Express
│       ├── config/              Variables de entorno validadas
│       ├── database/            Pool de conexiones a MySQL
│       ├── routes/              URLs de la API
│       ├── controllers/         Atienden cada URL
│       ├── services/            participaciones, catálogo, cuestionario y mail/ (cola persistente, despachador, turno rotativo de cuentas, SMTP, dry-run)
│       ├── repositories/        Único lugar con SQL (siempre parametrizado)
│       ├── validators/          Validación de los datos entrantes
│       ├── middleware/          Límites de uso, origen permitido, validaciones y errores
│       ├── templates/           Diseño del correo (HTML y texto)
│       └── utils/               Cifrado AES-256-GCM, logger, errores HTTP, maskEmail
│
├── shared/                      Dominio compartido (@huella/shared), lo usan cliente y servidor
│   └── src/                     calculator, questionnaire, answers, participant, levels,
│                                recommendations, categories, questionTypes
│
├── database/
│   ├── BDesquema_huella_carbono.sql          Estructura de la base `huella_carbono`
│   ├── datos-iniciales.sql                   Países, estados, municipios, unidades regionales, escuelas y cuestionario
│
├── eslint.config.js             Configuración única de ESLint
└── package.json                 Monorepo (npm workspaces) y scripts
```

## Que sale de la base de datos y que no

| Dato | Dónde vive |
|---|---|
| Preguntas, opciones, filas de matriz y pesos (`preguntas`, `opciones`, `filas_matriz`, `pesos_matriz`) | MySQL |
| Países, estados, municipios, unidades regionales y escuelas / facultades | MySQL |
| Cuentas de Gmail y su cupo diario (`cuentas_correo`) | MySQL |
| Participaciones, respuestas y bitácora de correos (`participaciones`, `respuestas`, `envios_correo`) | Se escriben en MySQL |
| Topes de las barras (854, 4080 y 2249 kg) y del termómetro (8000 kg) | Código: `shared/src/calculator.js` |
| Niveles de impacto, umbrales, textos y leyenda de árboles | Código: `shared/src/levels.js` |
| Recomendaciones | Código: `shared/src/recommendations.js` |
| Nombres de las categorías (el enum `categoria` de la base solo guarda la clave) | Código: `shared/src/categories.js` |
| Ícono de cada pregunta | Código: `client/src/components/quiz/StepIcon.jsx` |
| Largos máximos de los campos del formulario | Código: `shared/src/participant.js` (igual a las columnas de `participaciones`) |

## Formulario final: ubicación e institución

El formulario pide, además de los datos personales:

- **País.** México aparece primero. Si es México se piden **estado** y **municipio** (la lista de municipios depende del estado); con cualquier otro país se pide **ciudad o provincia** como texto.
- **Unidad regional UAS.** Si se elige una unidad de la UAS, se pide la **escuela o facultad** de esa unidad. Con la opción **Otros (fuera de la UAS)** se pide el **nombre de la escuela o institución** como texto.

Las reglas están en `shared/src/participant.js` y las usan el navegador y el servidor. El servidor, además, comprueba en la base que el municipio pertenezca al estado y la escuela a la unidad, y rechaza datos incoherentes.

### Crear el primer administrador

Es la única forma de crear al primer superadministrador. La contraseña se escribe en la terminal sin mostrarse y no queda guardada en ningún archivo ni en el historial:

```bash
node server/scripts/crear-administrador.js
# con Docker:
docker compose exec app node server/scripts/crear-administrador.js
```

El mismo comando sirve para restablecer la contraseña de alguien que quedó fuera, si el correo ya existe, pregunta si se restablece, reactiva la cuenta y cierra sus sesiones. Los demás administradores se crean desde el panel (Administradores).

### Roles

| Sección | Administrador | Superadministrador |
|---|---|---|
| Resumen, participaciones (consulta y exportación), envíos de correo, mi cuenta | Sí | Sí |
| Eliminar participaciones | No | Sí |
| Agregar o editar cuentas de Gmail | No | Sí |
| Administradores y bitácora | No | Sí |

## Editar el cuestionario

Lo que cambies en las tablas del cuestionario se ve en la aplicación y se usa en el cálculo sin reiniciar el servidor, en máximo `CUESTIONARIO_CACHE_SECONDS` (60 s por defecto). Las participaciones ya guardadas conservan el total que tenían.

Se puede cambiar libremente: textos y subtítulos, el orden (`numero`, `orden`), los pesos (`kg_co2`, `horas`, `pesos_matriz`) y agregar preguntas, opciones, filas o columnas en las categorías `hogar`, `transporte` y `consumo`. El número que se muestra sale de `numero`; si el título trae uno escrito ("1. ...") se ignora.

Si una edición rompe una regla, el servidor lo registra en el log y sigue con la última versión válida.

Las recomendaciones dependen de las claves `focos` (`incandescentes`, `no_se`), `transporte` (`auto`) y `carne_matriz` (fila `res`, columnas `diario` y `4_6_dias`).

## Cómo se calcula

Cada pregunta suma a su categoría. Con las preguntas actuales: Hogar = P1 + P2 + P3, Transporte = (promedio de los modos por las horas del recorrido, P4 y P5) + vuelos (P6), Alimentación y consumo = P7 + P8 + P9 + P10. El resultado es una estimación orientativa. Los pesos están en las tablas `opciones` y `pesos_matriz`, y la fórmula en `shared/src/calculator.js`.

## Panel de administración: exportaciones y reenvío de correos

- **Exportar** (Participaciones > Exportar): Excel (.xlsx, con anchos de columna y fechas), PDF (reporte con logos, resumen y paginación) o CSV. Respetan los filtros y el orden en pantalla. Límites: Excel 20 000 filas, PDF 5 000, CSV 50 000; si se supera, el panel avisa que el archivo quedó incompleto.
- **Correo**: arriba se muestra el total de correos enviados (sumando todas las cuentas), los de hoy, los pendientes y el cupo disponible hoy.
- **Reenviar correos**: desde Correo > Pendientes (elegidos o todos), desde la lista de Participaciones, el detalle de una participación o un fallo de la bitácora. El reenvío corre en segundo plano con barra de avance, usa las cuentas con cupo y se detiene si se acaba; lo que falta queda pendiente. El correo se arma con las cifras guardadas. Solo puede haber un reenvío a la vez.
- Dependencias nuevas del servidor: `exceljs` y `pdfkit` (`npm install`); la fuente del PDF está en `server/assets/fonts/`.