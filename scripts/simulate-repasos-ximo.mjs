import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDnWxSuYvFZUpNclff6fXzx45hltAL5i3I",
  authDomain: "planificador-semanal-enue.firebaseapp.com",
  projectId: "planificador-semanal-enue",
  storageBucket: "planificador-semanal-enue.firebasestorage.app",
  messagingSenderId: "283726110291",
  appId: "1:283726110291:web:aa11836d1a3b90da22f0a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_ID = 'u_jtejuelo_enue_es'; // Usuario Ximo

// 4 Obras Inventadas para la Simulación
const SIMULATED_OBRAS = [
  {
    id: 'obra_sim_1',
    nombre: 'Residencial Infinity Suites (Poblats Marítims)',
    activo: 1
  },
  {
    id: 'obra_sim_2',
    nombre: 'Reforma Integral Ático Gran Vía Marqués del Turia',
    activo: 1
  },
  {
    id: 'obra_sim_3',
    nombre: 'Villa Unifamiliar Los Olivos - El Vedat',
    activo: 1
  },
  {
    id: 'obra_sim_4',
    nombre: 'Complejo Empresarial Innova Hub (Parque Tecnológico)',
    activo: 1
  }
];

// Función para empaquetar notas y aplazamientos con el formato de la app
function formatNotas(userNotas, aplazamientos = []) {
  if (!aplazamientos || aplazamientos.length === 0) return userNotas;
  const serialized = `[HISTORIAL_APLAZAMIENTOS: ${JSON.stringify(aplazamientos)}]`;
  return userNotas ? `${userNotas}\n\n${serialized}` : serialized;
}

// Generación de tareas y repasos satisfactorios para todos los días restantes de Octubre 2026 (13 al 31 de Octubre)
const SIMULATED_TAREAS = [
  // ==========================================
  // SEMANA 1: 12-18 OCTUBRE 2026 (fecha_semana: 2026-10-12)
  // ==========================================
  {
    id: 't_sim_101',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-12',
    dia_semana: 'Martes', // 2026-10-13 (HOY)
    actividad: 'Repaso conexionado cuadro secundario y mecanismos planta 1',
    gremio: 'Electricidad',
    completada: 1,
    fecha_creado: '2026-10-08T09:15:00.000Z',
    userNotas: 'Verificado con comprobador de tensión y disparo de diferenciales. Todo operativo conforme.',
    aplazamientos: [
      {
        id: 'apl_sim_101_1',
        fecha_anterior: '2026-10-09',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-13',
        dia_nuevo: 'Martes',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Pendiente entrega de magnetotérmicos diferenciales 40A curva C por Schneider.',
        fecha_registro: '2026-10-09T16:30:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_102',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-12',
    dia_semana: 'Martes', // 2026-10-13 (HOY)
    actividad: 'Repaso estanqueidad colectores y circuitos suelo radiante',
    gremio: 'Fontanería',
    completada: 1,
    fecha_creado: '2026-10-10T11:00:00.000Z',
    userNotas: 'Prueba de presión hidráulica superada a 6 bar durante 4 horas sin caída de manómetro.',
    aplazamientos: [
      {
        id: 'apl_sim_102_1',
        fecha_anterior: '2026-10-12',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-13',
        dia_nuevo: 'Martes',
        tags: ['Ajuste técnico'],
        motivo: 'Ajuste técnico',
        detalle: 'Ajuste de purgadores automáticos y llaves micrométricas en manifold cocina.',
        fecha_registro: '2026-10-12T14:10:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_103',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-12',
    dia_semana: 'Miércoles', // 2026-10-14
    actividad: 'Repaso encintado fino de juntas y foseados luz indirecta salón',
    gremio: 'Pladur / Yeso',
    completada: 1,
    fecha_creado: '2026-10-07T08:30:00.000Z',
    userNotas: 'Inspeccionado con foco a luz rasante. Superficie Q4 perfecta para recibir pintura.',
    aplazamientos: [
      {
        id: 'apl_sim_103_1',
        fecha_anterior: '2026-10-09',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-14',
        dia_nuevo: 'Miércoles',
        tags: ['Retoque de acabado'],
        motivo: 'Retoque de acabado',
        detalle: 'Faltaba afinado de esquinas interiores con pasta de fraguado rápido.',
        fecha_registro: '2026-10-09T17:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_104',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-12',
    dia_semana: 'Miércoles', // 2026-10-14
    actividad: 'Repaso equilibrado de caudal y difusores sala de juntas',
    gremio: 'Climatización',
    completada: 1,
    fecha_creado: '2026-10-06T10:00:00.000Z',
    userNotas: 'Caudalímetro calibrado. Nivel sonoro por debajo de 32 dBA según prescripción.',
    aplazamientos: [
      {
        id: 'apl_sim_104_1',
        fecha_anterior: '2026-10-08',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-14',
        dia_nuevo: 'Miércoles',
        tags: ['Coordinación gremios'],
        motivo: 'Coordinación gremios',
        detalle: 'Coincidencia con montaje de mamparas de vidrio en el mismo acceso.',
        fecha_registro: '2026-10-08T15:45:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_105',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-12',
    dia_semana: 'Jueves', // 2026-10-15
    actividad: 'Repaso manos de pintura terminación y recorte zócalos suite principal',
    gremio: 'Pintura',
    completada: 1,
    fecha_creado: '2026-10-05T09:00:00.000Z',
    userNotas: 'Acabado liso satinado sin sombras. Aprobado por el arquitecto técnico.',
    aplazamientos: [
      {
        id: 'apl_sim_105_1',
        fecha_anterior: '2026-10-08',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-12',
        dia_nuevo: 'Lunes',
        tags: ['Humedad en soporte'],
        motivo: 'Humedad en soporte',
        detalle: 'Se requirió deshumidificador por secado lento del yeso.',
        fecha_registro: '2026-10-08T12:00:00.000Z'
      },
      {
        id: 'apl_sim_105_2',
        fecha_anterior: '2026-10-12',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-15',
        dia_nuevo: 'Jueves',
        tags: ['Espera de gremio previo'],
        motivo: 'Espera de gremio previo',
        detalle: 'Montaje de armarios empotrados provocó pequeños roces a repasar.',
        fecha_registro: '2026-10-12T18:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_106',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-12',
    dia_semana: 'Jueves', // 2026-10-15
    actividad: 'Repaso ajuste hojas correderas empotradas y frenos Scrigno',
    gremio: 'Carpintería Madera',
    completada: 1,
    fecha_creado: '2026-10-09T14:00:00.000Z',
    userNotas: 'Deslizamiento suave, tope amortiguador ajustado a ras de jamba.',
    aplazamientos: [
      {
        id: 'apl_sim_106_1',
        fecha_anterior: '2026-10-13',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-15',
        dia_nuevo: 'Jueves',
        tags: ['Ajuste herrajes'],
        motivo: 'Ajuste herrajes',
        detalle: 'Sustitución de juego de rodamientos de guiado por holgura.',
        fecha_registro: '2026-10-13T11:20:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_107',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-12',
    dia_semana: 'Viernes', // 2026-10-16
    actividad: 'Repaso rejuntado porcelánico gran formato y sellado elástico terraza',
    gremio: 'Albañilería',
    completada: 1,
    fecha_creado: '2026-10-08T16:00:00.000Z',
    userNotas: 'Borada epoxi antimoho terminada y limpia. Junta de dilatación perimetral sellada.',
    aplazamientos: [
      {
        id: 'apl_sim_107_1',
        fecha_anterior: '2026-10-12',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-16',
        dia_nuevo: 'Viernes',
        tags: ['Climatología'],
        motivo: 'Climatología',
        detalle: 'Lluvia y viento impidieron la aplicación segura de la resina exterior.',
        fecha_registro: '2026-10-12T08:45:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_108',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-12',
    dia_semana: 'Viernes', // 2026-10-16
    actividad: 'Repaso anclajes y alineación barandilla de vidrio escalera principal',
    gremio: 'Cerrajería',
    completada: 1,
    fecha_creado: '2026-10-11T12:00:00.000Z',
    userNotas: 'Perfil base de aluminio fijado con taco químico Hilti. Nivelación láser impecable.',
    aplazamientos: [
      {
        id: 'apl_sim_108_1',
        fecha_anterior: '2026-10-14',
        dia_anterior: 'Miércoles',
        fecha_nueva: '2026-10-16',
        dia_nuevo: 'Viernes',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Esperando tacos químicos estructurales de fraguado rápido.',
        fecha_registro: '2026-10-14T10:15:00.000Z'
      }
    ]
  },

  // ==========================================
  // SEMANA 2: 19-25 OCTUBRE 2026 (fecha_semana: 2026-10-19)
  // ==========================================
  {
    id: 't_sim_201',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-19',
    dia_semana: 'Lunes', // 2026-10-19
    actividad: 'Repaso estanqueidad y cierre oscilobatiente balconeras fachada sur',
    gremio: 'Carpintería Aluminio',
    completada: 1,
    fecha_creado: '2026-10-13T10:30:00.000Z',
    userNotas: 'Regulación de compases y puntos de cierre. Test de humo y estanqueidad ok.',
    aplazamientos: [
      {
        id: 'apl_sim_201_1',
        fecha_anterior: '2026-10-15',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-19',
        dia_nuevo: 'Lunes',
        tags: ['Ajuste herrajes'],
        motivo: 'Ajuste herrajes',
        detalle: 'Rozaba bulón inferior en marco de hoja derecha.',
        fecha_registro: '2026-10-15T16:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_202',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-19',
    dia_semana: 'Lunes', // 2026-10-19
    actividad: 'Repaso programación domótica y escenas iluminación DALI / KNX',
    gremio: 'Electricidad',
    completada: 1,
    fecha_creado: '2026-10-14T15:00:00.000Z',
    userNotas: 'Pasarela KNX reprogramada. Escenas "Bienvenida", "Cine" y "Noche" funcionando al 100%.',
    aplazamientos: [
      {
        id: 'apl_sim_202_1',
        fecha_anterior: '2026-10-16',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-19',
        dia_nuevo: 'Lunes',
        tags: ['Retraso subcontrata'],
        motivo: 'Retraso subcontrata',
        detalle: 'Técnico integrador domótico no pudo asistir por cierre de obra el viernes.',
        fecha_registro: '2026-10-16T13:30:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_203',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-19',
    dia_semana: 'Martes', // 2026-10-20
    actividad: 'Repaso y puesta en marcha aerotermia y acumulador ACS',
    gremio: 'Fontanería',
    completada: 1,
    fecha_creado: '2026-10-09T08:00:00.000Z',
    userNotas: 'Puesta en marcha con servicio técnico oficial Daikin. Certificado de garantía sellado.',
    aplazamientos: [
      {
        id: 'apl_sim_203_1',
        fecha_anterior: '2026-10-13',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-16',
        dia_nuevo: 'Viernes',
        tags: ['Falta suministro'],
        motivo: 'Falta suministro',
        detalle: 'Potencia provisional de obra insuficiente para arranque de compresor.',
        fecha_registro: '2026-10-13T10:00:00.000Z'
      },
      {
        id: 'apl_sim_203_2',
        fecha_anterior: '2026-10-16',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-20',
        dia_nuevo: 'Martes',
        tags: ['Cita técnica SAT'],
        motivo: 'Cita técnica SAT',
        detalle: 'Coordinación fecha con el técnico homologado del fabricante.',
        fecha_registro: '2026-10-16T14:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_204',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-19',
    dia_semana: 'Martes', // 2026-10-20
    actividad: 'Repaso sellado juntas y nivelación suelo técnico elevado en oficinas',
    gremio: 'Pavimentos',
    completada: 1,
    fecha_creado: '2026-10-15T11:00:00.000Z',
    userNotas: 'Placas asentadas sin balanceos. Rejillas de climatización rasantes ajustadas.',
    aplazamientos: [
      {
        id: 'apl_sim_204_1',
        fecha_anterior: '2026-10-16',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-20',
        dia_nuevo: 'Martes',
        tags: ['Paso de instalaciones'],
        motivo: 'Paso de instalaciones',
        detalle: 'Esperando tendido final de bandejas de fibra óptica bajo suelo.',
        fecha_registro: '2026-10-16T17:15:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_205',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-19',
    dia_semana: 'Miércoles', // 2026-10-21
    actividad: 'Repaso pendientes y cazoletas de desagüe en cubierta solárium',
    gremio: 'Albañilería',
    completada: 1,
    fecha_creado: '2026-10-14T09:00:00.000Z',
    userNotas: 'Prueba de inundación superada sin bolsas de agua. Evacuación inmediata.',
    aplazamientos: [
      {
        id: 'apl_sim_205_1',
        fecha_anterior: '2026-10-16',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-21',
        dia_nuevo: 'Miércoles',
        tags: ['Ensayo estanqueidad'],
        motivo: 'Ensayo estanqueidad',
        detalle: 'Requeridas 48h de retención de agua antes de sellar las albardillas.',
        fecha_registro: '2026-10-16T11:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_206',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-19',
    dia_semana: 'Miércoles', // 2026-10-21
    actividad: 'Repaso esmaltado laca en puertas de paso y marcos',
    gremio: 'Pintura',
    completada: 1,
    fecha_creado: '2026-10-15T12:00:00.000Z',
    userNotas: 'Lacado impecable en blanco roto satinado. Sin restos de polvo ni motas.',
    aplazamientos: [
      {
        id: 'apl_sim_206_1',
        fecha_anterior: '2026-10-19',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-21',
        dia_nuevo: 'Miércoles',
        tags: ['Retoque posmontaje'],
        motivo: 'Retoque posmontaje',
        detalle: 'Pequeñas marcas en tapajuntas tras colocación de cerraduras magnéticas.',
        fecha_registro: '2026-10-19T13:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_207',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-19',
    dia_semana: 'Jueves', // 2026-10-22
    actividad: 'Repaso sectorización riego por goteo y tepe perimetral piscina',
    gremio: 'Jardinería / Exteriores',
    completada: 1,
    fecha_creado: '2026-10-14T08:00:00.000Z',
    userNotas: 'Electroválvulas conectadas a programador inteligente. Riego homogéneo comprobado.',
    aplazamientos: [
      {
        id: 'apl_sim_207_1',
        fecha_anterior: '2026-10-16',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-22',
        dia_nuevo: 'Jueves',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Retraso en el suministro de rollos de césped natural bermuda desde vivero.',
        fecha_registro: '2026-10-16T12:45:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_208',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-19',
    dia_semana: 'Jueves', // 2026-10-22
    actividad: 'Repaso muelles cierrapuertas cortafuegos RF-60 en núcleos de escalera',
    gremio: 'Cerrajería',
    completada: 1,
    fecha_creado: '2026-10-16T14:00:00.000Z',
    userNotas: 'Fuerza de cierre y golpe final calibrados según normativa de evacuación CTE DB-SI.',
    aplazamientos: [
      {
        id: 'apl_sim_208_1',
        fecha_anterior: '2026-10-20',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-22',
        dia_nuevo: 'Jueves',
        tags: ['Ajuste técnico'],
        motivo: 'Ajuste técnico',
        detalle: 'Regulación de selectores de cierre en puertas dobles planta 2 y 3.',
        fecha_registro: '2026-10-20T16:20:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_209',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-19',
    dia_semana: 'Viernes', // 2026-10-23
    actividad: 'Repaso desincrustado final restos de cemento y cristales en fachada',
    gremio: 'Limpieza Obra',
    completada: 1,
    fecha_creado: '2026-10-18T17:00:00.000Z',
    userNotas: 'Limpieza con máquina de agua osmotizada en altura. Cristales y perfiles impolutos.',
    aplazamientos: [
      {
        id: 'apl_sim_209_1',
        fecha_anterior: '2026-10-21',
        dia_anterior: 'Miércoles',
        fecha_nueva: '2026-10-23',
        dia_nuevo: 'Viernes',
        tags: ['Espera andamio'],
        motivo: 'Espera andamio',
        detalle: 'Desmontaje del andamio de fachada completado la mañana del jueves.',
        fecha_registro: '2026-10-21T09:15:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_210',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-19',
    dia_semana: 'Viernes', // 2026-10-23
    actividad: 'Repaso pulido y sellado encimera porcelánica isla Neolith',
    gremio: 'Marmolista',
    completada: 1,
    fecha_creado: '2026-10-17T11:00:00.000Z',
    userNotas: 'Juntas a inglete selladas con masilla bicomponente al tono exacto. Tratamiento antimanchas aplicado.',
    aplazamientos: [
      {
        id: 'apl_sim_210_1',
        fecha_anterior: '2026-10-20',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-23',
        dia_nuevo: 'Viernes',
        tags: ['Detalle de acabado'],
        motivo: 'Detalle de acabado',
        detalle: 'Ajuste milimétrico de cajeado para enchufe escamoteable y placa inducción.',
        fecha_registro: '2026-10-20T12:00:00.000Z'
      }
    ]
  },

  // ==========================================
  // SEMANA 3: 26-31 OCTUBRE 2026 (fecha_semana: 2026-10-26)
  // ==========================================
  {
    id: 't_sim_301',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-26',
    dia_semana: 'Lunes', // 2026-10-26
    actividad: 'Repaso conexionado cuadro de mando y bomba clorador salino piscina',
    gremio: 'Electricidad',
    completada: 1,
    fecha_creado: '2026-10-20T09:00:00.000Z',
    userNotas: 'Electrolisis salina y sonda de pH calibradas. Agua en parámetros higiénico-sanitarios.',
    aplazamientos: [
      {
        id: 'apl_sim_301_1',
        fecha_anterior: '2026-10-22',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-26',
        dia_nuevo: 'Lunes',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Pendiente recibir caja de superficie estanca IP66 para clorador.',
        fecha_registro: '2026-10-22T15:30:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_302',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-26',
    dia_semana: 'Lunes', // 2026-10-26
    actividad: 'Repaso certificación tomas de datos Cat6A en puestos operativos',
    gremio: 'Telecomunicaciones',
    completada: 1,
    fecha_creado: '2026-10-18T10:00:00.000Z',
    userNotas: '128 tomas testeadas con certificador Fluke. 100% aprobado en banda Gigabit.',
    aplazamientos: [
      {
        id: 'apl_sim_302_1',
        fecha_anterior: '2026-10-21',
        dia_anterior: 'Miércoles',
        fecha_nueva: '2026-10-23',
        dia_nuevo: 'Viernes',
        tags: ['Avería equipo'],
        motivo: 'Avería equipo',
        detalle: 'Certificador de red en calibración anual obligatoria.',
        fecha_registro: '2026-10-21T08:30:00.000Z'
      },
      {
        id: 'apl_sim_302_2',
        fecha_anterior: '2026-10-23',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-26',
        dia_nuevo: 'Lunes',
        tags: ['Reetiquetado'],
        motivo: 'Reetiquetado',
        detalle: 'Cambio de nomenclatura en patch panels según petición del cliente.',
        fecha_registro: '2026-10-23T16:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_303',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-26',
    dia_semana: 'Martes', // 2026-10-27
    actividad: 'Repaso cilindros alta seguridad amaestrados en puertas de acceso',
    gremio: 'Cerrajería',
    completada: 1,
    fecha_creado: '2026-10-21T13:00:00.000Z',
    userNotas: 'Bombillos antibumping TESA instalados. Tarjetas de seguridad entregadas en sobre cerrado.',
    aplazamientos: [
      {
        id: 'apl_sim_303_1',
        fecha_anterior: '2026-10-23',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-27',
        dia_nuevo: 'Martes',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Plazo de entrega de fábrica para amaestramiento de 16 cilindros.',
        fecha_registro: '2026-10-23T11:45:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_304',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-26',
    dia_semana: 'Martes', // 2026-10-27
    actividad: 'Repaso rejillas lineales lacadas y retorno aire en falsos techos',
    gremio: 'Climatización',
    completada: 1,
    fecha_creado: '2026-10-22T16:00:00.000Z',
    userNotas: 'Rejillas rasantes Madel perfectamente alineadas sin juntas visibles.',
    aplazamientos: [
      {
        id: 'apl_sim_304_1',
        fecha_anterior: '2026-10-26',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-27',
        dia_nuevo: 'Martes',
        tags: ['Retoque acabado'],
        motivo: 'Retoque acabado',
        detalle: 'Una pieza tenía pequeño arañazo de transporte y se llevó a taller para relacado.',
        fecha_registro: '2026-10-26T10:10:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_305',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-26',
    dia_semana: 'Miércoles', // 2026-10-28
    actividad: 'Repaso motorización y lamas orientables pérgola bioclimática',
    gremio: 'Carpintería Aluminio',
    completada: 1,
    fecha_creado: '2026-10-23T09:30:00.000Z',
    userNotas: 'Sensores de lluvia Somfy programados. Cierre estanco y canalización de pluviales correcta.',
    aplazamientos: [
      {
        id: 'apl_sim_305_1',
        fecha_anterior: '2026-10-26',
        dia_anterior: 'Lunes',
        fecha_nueva: '2026-10-28',
        dia_nuevo: 'Miércoles',
        tags: ['Ajuste eléctrico'],
        motivo: 'Ajuste eléctrico',
        detalle: 'Sincronización de finales de carrera y pareo con mando multifunción.',
        fecha_registro: '2026-10-26T14:30:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_306',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-26',
    dia_semana: 'Miércoles', // 2026-10-28
    actividad: 'Repaso techos acústicos fonoabsorbentes en sala de conferencias',
    gremio: 'Pladur / Yeso',
    completada: 1,
    fecha_creado: '2026-10-22T08:00:00.000Z',
    userNotas: 'Placas Knauf Danoline revisadas. Perfilería oculta fijada y enrasada.',
    aplazamientos: [
      {
        id: 'apl_sim_306_1',
        fecha_anterior: '2026-10-27',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-28',
        dia_nuevo: 'Miércoles',
        tags: ['Coordinación gremios'],
        motivo: 'Coordinación gremios',
        detalle: 'Instalación de proyector audiovisual retrasó el cierre de la última hilera.',
        fecha_registro: '2026-10-27T17:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_307',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-26',
    dia_semana: 'Jueves', // 2026-10-29
    actividad: 'Repaso griferías empotradas y prueba hidrostática bañera exenta',
    gremio: 'Fontanería',
    completada: 1,
    fecha_creado: '2026-10-24T12:00:00.000Z',
    userNotas: 'Termostáticos Hansgrohe calibrados a 38ºC. Sin filtraciones en sifón extraplano.',
    aplazamientos: [
      {
        id: 'apl_sim_307_1',
        fecha_anterior: '2026-10-27',
        dia_anterior: 'Martes',
        fecha_nueva: '2026-10-29',
        dia_nuevo: 'Jueves',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Sustitución de embellecedor cormado por defecto de fábrica en el cromado.',
        fecha_registro: '2026-10-27T11:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_308',
    obra_id: 'obra_sim_2',
    fecha_semana: '2026-10-26',
    dia_semana: 'Jueves', // 2026-10-29
    actividad: 'Repaso solado terraza con tarima tecnológica de composite sobre plots',
    gremio: 'Albañilería',
    completada: 1,
    fecha_creado: '2026-10-25T10:00:00.000Z',
    userNotas: 'Rastrelado y clipado oculto completado. Nivelación y pendiente a sumidero verificadas.',
    aplazamientos: [
      {
        id: 'apl_sim_308_1',
        fecha_anterior: '2026-10-28',
        dia_anterior: 'Miércoles',
        fecha_nueva: '2026-10-29',
        dia_nuevo: 'Jueves',
        tags: ['Ajuste nivelación'],
        motivo: 'Ajuste nivelación',
        detalle: 'Regulación milimétrica de plots autonivelantes en zona perimetral.',
        fecha_registro: '2026-10-28T16:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_309',
    obra_id: 'obra_sim_3',
    fecha_semana: '2026-10-26',
    dia_semana: 'Viernes', // 2026-10-30
    actividad: 'Repaso general de pintura previo a entrega de llaves y recepción',
    gremio: 'Pintura',
    completada: 1,
    fecha_creado: '2026-10-26T08:30:00.000Z',
    userNotas: 'Retoques finales tras desprotección de suelos. Obra lista para recepción definitiva.',
    aplazamientos: [
      {
        id: 'apl_sim_309_1',
        fecha_anterior: '2026-10-28',
        dia_anterior: 'Miércoles',
        fecha_nueva: '2026-10-30',
        dia_nuevo: 'Viernes',
        tags: ['Coordinación limpieza'],
        motivo: 'Coordinación limpieza',
        detalle: 'Coordinado con el fin de la limpieza profunda de ventanales y suelos.',
        fecha_registro: '2026-10-28T18:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_310',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-26',
    dia_semana: 'Viernes', // 2026-10-30
    actividad: 'Repaso centralita detección de incendios y pulsadores de emergencia',
    gremio: 'Seguridad y PCI',
    completada: 1,
    fecha_creado: '2026-10-26T11:00:00.000Z',
    userNotas: 'Conexión con central receptora de alarmas validada. Sirenas y compuertas ensayadas con éxito.',
    aplazamientos: [
      {
        id: 'apl_sim_310_1',
        fecha_anterior: '2026-10-29',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-30',
        dia_nuevo: 'Viernes',
        tags: ['Prueba técnica oficial'],
        motivo: 'Prueba técnica oficial',
        detalle: 'Presencia del técnico de la empresa de seguridad para firma del acta.',
        fecha_registro: '2026-10-29T15:00:00.000Z'
      }
    ]
  },
  {
    id: 't_sim_311',
    obra_id: 'obra_sim_1',
    fecha_semana: '2026-10-26',
    dia_semana: 'Sábado', // 2026-10-31
    actividad: 'Repaso abrillantado y desinfección final antes de entrega a clientes',
    gremio: 'Limpieza Obra',
    completada: 1,
    fecha_creado: '2026-10-28T15:00:00.000Z',
    userNotas: 'Acabado de lujo. Llaves precintadas y listas para entrega el 2 de Noviembre.',
    aplazamientos: [
      {
        id: 'apl_sim_311_1',
        fecha_anterior: '2026-10-30',
        dia_anterior: 'Viernes',
        fecha_nueva: '2026-10-31',
        dia_nuevo: 'Sábado',
        tags: ['Planificación entrega'],
        motivo: 'Planificación entrega',
        detalle: 'Ajuste de agenda con la promotora para entrega de llaves.',
        fecha_registro: '2026-10-30T17:30:00.000Z'
      }
    ]
  },
  // Tarea de contraste (pendiente de subsanar)
  {
    id: 't_sim_312',
    obra_id: 'obra_sim_4',
    fecha_semana: '2026-10-26',
    dia_semana: 'Sábado', // 2026-10-31
    actividad: 'Repaso balizamiento LED exterior en viales de acceso parking',
    gremio: 'Electricidad',
    completada: 0, // Pendiente para contraste en el informe
    fecha_creado: '2026-10-27T10:00:00.000Z',
    userNotas: 'Pendiente llegada de balizas desde aduanas.',
    aplazamientos: [
      {
        id: 'apl_sim_312_1',
        fecha_anterior: '2026-10-29',
        dia_anterior: 'Jueves',
        fecha_nueva: '2026-10-31',
        dia_nuevo: 'Sábado',
        tags: ['Falta material'],
        motivo: 'Falta material',
        detalle: 'Retención de envío internacional en terminal aduanera.',
        fecha_registro: '2026-10-29T16:00:00.000Z'
      }
    ]
  }
];

async function runSimulation() {
  console.log(`Iniciando simulación para el usuario Ximo (${USER_ID})...`);

  // 1. Guardar las 4 obras inventadas en Firestore
  console.log('1. Guardando 4 obras inventadas...');
  for (const obra of SIMULATED_OBRAS) {
    const obraDocRef = doc(db, 'users', USER_ID, 'obras', obra.id);
    await setDoc(obraDocRef, {
      id: obra.id,
      nombre: obra.nombre,
      activo: obra.activo
    });
    console.log(`   ✓ Obra creada: ${obra.nombre} (${obra.id})`);
  }

  // 2. Guardar las tareas y repasos simulados
  console.log('\n2. Guardando actividades y repasos satisfactorios desplazados...');
  let countCompleted = 0;
  for (const t of SIMULATED_TAREAS) {
    const tareaDocRef = doc(db, 'users', USER_ID, 'tareas', t.id);
    const serializedNotas = formatNotas(t.userNotas, t.aplazamientos);

    await setDoc(tareaDocRef, {
      id: t.id,
      obra_id: t.obra_id,
      fecha_semana: t.fecha_semana,
      dia_semana: t.dia_semana,
      actividad: t.actividad,
      gremio: t.gremio,
      completada: t.completada,
      notas: serializedNotas,
      fecha_creado: t.fecha_creado
    });

    if (t.completada === 1) countCompleted++;
    console.log(`   ✓ [${t.fecha_semana} | ${t.dia_semana}] ${t.actividad.slice(0, 50)}... (${t.completada === 1 ? '✓ Hecho' : '⏳ Pendiente'})`);
  }

  console.log(`\n¡Simulación completada con éxito!`);
  console.log(`Total Obras creadas: ${SIMULATED_OBRAS.length}`);
  console.log(`Total Actividades/Repasos: ${SIMULATED_TAREAS.length}`);
  console.log(`Repasos Ejecutados Satisfactoriamente: ${countCompleted}`);
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('Error en la simulación:', err);
  process.exit(1);
});
