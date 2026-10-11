-- Datos exportados el 2026-10-11
CREATE TABLE IF NOT EXISTS obras (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  obra_id TEXT,
  fecha_semana TEXT,
  dia_semana TEXT,
  actividad TEXT,
  gremio TEXT,
  completada INTEGER DEFAULT 0,
  notas TEXT,
  fecha_creado TEXT
);
CREATE INDEX IF NOT EXISTS idx_tareas_obra ON tareas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tareas_semana ON tareas(fecha_semana);

INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES ('5', 'Salamanca 50', 1);
INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES ('6', 'Almirante 32', 1);
INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES ('7', 'Barraca 167', 1);
INSERT OR REPLACE INTO obras (id, nombre, activo) VALUES ('o_1786512112062', 'Vilarrasa', 1);
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512160713', '7', '2026-08-24', 'Lunes', 'Remates finales pladur y encintados', 'Pladur / Yeso', 0, 'Revisar todos los rodapies!!!', '2026-08-12T05:22:40.713Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512232247', '7', '2026-08-24', 'Lunes', 'Vaciado y limpieza total obra incluido garaje', 'Albañilería', 0, '', '2026-08-12T05:23:52.247Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512285016', '7', '2026-08-24', 'Lunes', 'Pedir pavimento de barro Tendezzia', 'Albañilería', 0, 'Está en el almacen de tendenzzia', '2026-08-12T05:24:45.016Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512304411', '7', '2026-08-24', 'Martes', 'Colocacion barro en balcones', 'Albañilería', 0, '', '2026-08-12T05:25:04.411Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512404483', '7', '2026-09-07', 'Lunes', 'Avisar carpintero para interiores de armarios y medir cabeceros camas y muebles de baños', 'Carpintería', 0, '', '2026-08-12T05:26:44.483Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786512796689_6wusl4', '7', '2026-08-24', 'Miércoles', 'Colocacion barro en patio', 'Albañilería', 0, '', '2026-08-12T05:33:16.689Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786513037938', '7', '2026-08-31', 'Lunes', 'Revisar Templaval puertas de baños', 'Otros', 0, '', '2026-08-12T05:37:17.938Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786513059658', '7', '2026-08-31', 'Lunes', 'Revisar techos tensados precios', 'Otros', 0, '', '2026-08-12T05:37:39.658Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618111765', '5', '2026-08-24', 'Martes', 'Medicion armarios y libreria del salon', 'Carpintería', 0, 'JUAN ESTEBAN', '2026-08-13T10:48:31.765Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618132716', '5', '2026-08-24', 'Martes', 'Medicion puertas paso', 'Carpintería', 0, 'LEON', '2026-08-13T10:48:52.716Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618156373', '5', '2026-08-24', 'Lunes', 'Replanteo baños mármol', 'Albañilería', 0, '', '2026-08-13T10:49:16.373Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618227193', '5', '2026-08-24', 'Lunes', 'Continuar con la colocacion de focos en bovedilla', 'Albañilería', 0, 'Maicol y Miguel', '2026-08-13T10:50:27.193Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618652558', '5', '2026-08-24', 'Martes', 'Colocacion mármol baños comenzar por baño de la ducha', 'Albañilería', 0, 'Habrá que modificar la altura de la bañera para que coincida con la baldosa de 40x60 segun plano detalle. Ahora esta a 51 cm de altura.', '2026-08-13T10:57:32.558Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786618708233', '5', '2026-08-24', 'Miércoles', 'Hablar con Carlos de Tarimas del mundo para organizar instalacion tarima', 'Carpintería', 0, 'Presupuesto en carpeta de industriales', '2026-08-13T10:58:28.233Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619368482', '5', '2026-08-24', 'Miércoles', 'Vaciar trastos vivienda', 'Albañilería', 0, '', '2026-08-13T11:09:28.482Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619463475', '6', '2026-08-24', 'Lunes', 'Buscar y comprar panel sandwich en Leroy Merlin para techo exterior', 'Albañilería', 0, 'Angel', '2026-08-13T11:11:03.475Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619494051', '6', '2026-08-24', 'Lunes', 'Enlucido fachada exterior terraza', 'Albañilería', 0, '', '2026-08-13T11:11:34.051Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619517157', '6', '2026-08-24', 'Martes', 'Preparar los 2 platos de ducha de obra', 'Albañilería', 0, 'En PB escalon de 10 cm', '2026-08-13T11:11:57.157Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619569106', '6', '2026-08-31', 'Martes', 'Avisar a electricista continuar con tubo en P1', 'Albañilería', 0, '', '2026-08-13T11:12:49.106Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619630811', '6', '2026-08-31', 'Lunes', 'Recordar a Mahm que debe comenzar con la libreria', 'Albañilería', 0, '', '2026-08-13T11:13:50.811Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619694136', '6', '2026-08-31', 'Lunes', 'Pedir ventana de RALO baño P1', 'Carpintería', 0, '', '2026-08-13T11:14:54.136Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786619760656', '7', '2026-08-31', 'Lunes', 'Preguntar otra vez Tendenzzia sobre cerradura y tirador en puertas pasarela', 'Carpintería', 0, '', '2026-08-13T11:16:00.656Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786620109089', '6', '2026-08-24', 'Martes', 'Pedir suelo baño PB que está en tendezzia', 'Albañilería', 0, '', '2026-08-13T11:21:49.089Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786620172590', '6', '2026-08-24', 'Miércoles', 'Hablar con Fran para que retome Almirante 32 y se organice para comenzar', 'Albañilería', 0, 'Ppto aprobado por la propiedad', '2026-08-13T11:22:52.590Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786621818965', 'o_1786512112062', '2026-08-24', 'Lunes', 'Ir revisando material de passive para la vivienda por si hay que pedir más material', 'Albañilería', 0, 'Angel', '2026-08-13T11:50:18.965Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786622531525', '7', '2026-08-24', 'Martes', 'Avisar a Fran para que cuelgue la ud ext y finalice la instalación', 'Instalaciones', 0, '', '2026-08-13T12:02:11.525Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786622592143', '7', '2026-08-24', 'Miércoles', 'Seguimos esperando la puerta de entrada de la vivienda', 'Carpintería', 0, 'LEON', '2026-08-13T12:03:12.143Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786623670399', '7', '2026-08-31', 'Lunes', 'Hablar con Ernesto de los extras para poder ejecutarlos', 'Otros', 0, '', '2026-08-13T12:21:10.399Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786623762316', '7', '2026-08-31', 'Martes', 'Pedido iluminacion vivienda el 12-08-26, revisar como va el pedido', 'Instalaciones', 0, '', '2026-08-13T12:22:42.316Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786623867870', '7', '2026-08-31', 'Martes', 'Hace pedidos de porcelanico para cocina y encimera de aseo', 'Albañilería', 0, '', '2026-08-13T12:24:27.870Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786623937354', '7', '2026-08-31', 'Martes', 'Hablar con Mario para ver las rejillas de la fachada trasera de la vivienda y en el patio interior', 'Instalaciones', 0, '', '2026-08-13T12:25:37.354Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786624194468', '7', '2026-08-31', 'Martes', 'Revisar el revestimiento del patio interior por las humedades y grietas', 'Instalaciones', 0, '', '2026-08-13T12:29:54.468Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786687380001', 'o_1786512112062', '2026-08-31', 'Lunes', 'Revisar documentacion ocupacion via publica', 'Otros', 0, 'Expediente paralizado por falta de actualizacion de documentacion', '2026-08-14T06:03:00.001Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786689586537_gtanjx', '6', '2026-08-31', 'Lunes', 'Hablar con Fran para que retome Almirante 32 y se organice para comenzar', 'Albañilería', 0, 'Ppto aprobado por la propiedad', '2026-08-14T06:39:46.537Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786690061420', '5', '2026-08-24', 'Lunes', 'Hablar con Alfonso para ver cuando se podria instalar el parket', 'Otros', 0, '', '2026-08-14T06:47:41.420Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786690191199', 'o_1786512112062', '2026-08-24', 'Lunes', 'Revisar notificacion Ayto el 14-07 q solicitaba mas documentos actualizados', 'Otros', 0, 'el 14/08 le pedi a Jose Lafarge esos documentos actualizados.', '2026-08-14T06:49:51.199Z');
INSERT OR REPLACE INTO tareas (id, obra_id, fecha_semana, dia_semana, actividad, gremio, completada, notas, fecha_creado) VALUES ('t_1786690337507', 'o_1786512112062', '2026-08-31', 'Lunes', 'Enviado mediciones a Moldecor para valorar la obra. 14/08', 'Pladur / Yeso', 0, '', '2026-08-14T06:52:17.507Z');
