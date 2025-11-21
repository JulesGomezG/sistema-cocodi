--
-- PostgreSQL database dump
--

\restrict eOBYMRgUrgl200ArkhOSTo6tS10UFGSv56GIW6OAugP12BZqfkuUFGc1aTyrfOv

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dgs; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.dgs (
    id_dg integer NOT NULL,
    nombre_dg character varying(255) NOT NULL,
    siglas_dg character varying(50) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.dgs OWNER TO cocodi_user;

--
-- Name: dgs_id_dg_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.dgs_id_dg_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dgs_id_dg_seq OWNER TO cocodi_user;

--
-- Name: dgs_id_dg_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.dgs_id_dg_seq OWNED BY public.dgs.id_dg;


--
-- Name: directorio_contactos; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.directorio_contactos (
    id_contacto integer NOT NULL,
    id_institucion integer NOT NULL,
    id_tipo_organo integer,
    nombre_contacto character varying(255) NOT NULL,
    telefono character varying(40),
    extension character varying(10),
    email character varying(255),
    movil character varying(50),
    direccion text,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.directorio_contactos OWNER TO cocodi_user;

--
-- Name: directorio_contactos_id_contacto_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.directorio_contactos_id_contacto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.directorio_contactos_id_contacto_seq OWNER TO cocodi_user;

--
-- Name: directorio_contactos_id_contacto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.directorio_contactos_id_contacto_seq OWNED BY public.directorio_contactos.id_contacto;


--
-- Name: evidencias; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.evidencias (
    id_evidencia integer NOT NULL,
    parent_id integer NOT NULL,
    parent_type character varying(50) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    url_almacenamiento character varying(512) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.evidencias OWNER TO cocodi_user;

--
-- Name: evidencias_id_evidencia_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.evidencias_id_evidencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.evidencias_id_evidencia_seq OWNER TO cocodi_user;

--
-- Name: evidencias_id_evidencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.evidencias_id_evidencia_seq OWNED BY public.evidencias.id_evidencia;


--
-- Name: informes; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.informes (
    id_informe integer NOT NULL,
    id_institucion integer NOT NULL,
    id_tipo_organo integer NOT NULL,
    id_tipo_informe integer NOT NULL,
    periodicidad character varying(50) NOT NULL,
    periodo_reportado character varying(50) NOT NULL,
    fecha_informe date NOT NULL,
    descripcion text,
    recomendaciones_emitidas integer DEFAULT 0 NOT NULL,
    recomendaciones_atendidas integer DEFAULT 0 NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.informes OWNER TO cocodi_user;

--
-- Name: informes_id_informe_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.informes_id_informe_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.informes_id_informe_seq OWNER TO cocodi_user;

--
-- Name: informes_id_informe_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.informes_id_informe_seq OWNED BY public.informes.id_informe;


--
-- Name: institucion_organos; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.institucion_organos (
    id_institucion integer NOT NULL,
    id_tipo_organo integer NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100)
);


ALTER TABLE public.institucion_organos OWNER TO cocodi_user;

--
-- Name: institucion_tipo_informe_valido; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.institucion_tipo_informe_valido (
    id_institucion integer NOT NULL,
    id_tipo_informe integer NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100)
);


ALTER TABLE public.institucion_tipo_informe_valido OWNER TO cocodi_user;

--
-- Name: instituciones; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.instituciones (
    id_institucion integer NOT NULL,
    nombre_institucion character varying(255) NOT NULL,
    siglas character varying(50),
    id_ramo integer NOT NULL,
    id_naturaleza integer NOT NULL,
    id_naturaleza_juridica integer NOT NULL,
    id_responsable integer NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.instituciones OWNER TO cocodi_user;

--
-- Name: instituciones_id_institucion_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.instituciones_id_institucion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.instituciones_id_institucion_seq OWNER TO cocodi_user;

--
-- Name: instituciones_id_institucion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.instituciones_id_institucion_seq OWNED BY public.instituciones.id_institucion;


--
-- Name: naturalezas; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.naturalezas (
    id_naturaleza integer NOT NULL,
    nombre character varying(255) NOT NULL
);


ALTER TABLE public.naturalezas OWNER TO cocodi_user;

--
-- Name: naturalezas_id_naturaleza_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.naturalezas_id_naturaleza_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.naturalezas_id_naturaleza_seq OWNER TO cocodi_user;

--
-- Name: naturalezas_id_naturaleza_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.naturalezas_id_naturaleza_seq OWNED BY public.naturalezas.id_naturaleza;


--
-- Name: naturalezas_juridicas_desglose; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.naturalezas_juridicas_desglose (
    id_naturaleza_juridica integer NOT NULL,
    nombre character varying(255) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.naturalezas_juridicas_desglose OWNER TO cocodi_user;

--
-- Name: naturalezas_juridicas_desglose_id_naturaleza_juridica_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.naturalezas_juridicas_desglose_id_naturaleza_juridica_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.naturalezas_juridicas_desglose_id_naturaleza_juridica_seq OWNER TO cocodi_user;

--
-- Name: naturalezas_juridicas_desglose_id_naturaleza_juridica_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.naturalezas_juridicas_desglose_id_naturaleza_juridica_seq OWNED BY public.naturalezas_juridicas_desglose.id_naturaleza_juridica;


--
-- Name: ramos; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.ramos (
    id_ramo integer NOT NULL,
    numero_ramo character varying(10) NOT NULL,
    nombre_ramo character varying(255) NOT NULL,
    id_dg integer NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.ramos OWNER TO cocodi_user;

--
-- Name: ramos_id_ramo_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.ramos_id_ramo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ramos_id_ramo_seq OWNER TO cocodi_user;

--
-- Name: ramos_id_ramo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.ramos_id_ramo_seq OWNED BY public.ramos.id_ramo;


--
-- Name: recomendaciones; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.recomendaciones (
    id_recomendacion integer NOT NULL,
    id_informe integer,
    id_institucion integer NOT NULL,
    id_tipo_organo integer NOT NULL,
    descripcion text NOT NULL,
    area_responsable_atencion character varying(255) NOT NULL,
    fecha_emision date NOT NULL,
    fecha_compromiso date,
    estatus character varying(50) DEFAULT 'Pendiente'::character varying NOT NULL,
    prioridad character varying(50) DEFAULT 'Media'::character varying,
    tipo_recomendacion character varying(100) DEFAULT 'Correctiva'::character varying,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.recomendaciones OWNER TO cocodi_user;

--
-- Name: recomendaciones_id_recomendacion_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.recomendaciones_id_recomendacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recomendaciones_id_recomendacion_seq OWNER TO cocodi_user;

--
-- Name: recomendaciones_id_recomendacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.recomendaciones_id_recomendacion_seq OWNED BY public.recomendaciones.id_recomendacion;


--
-- Name: responsables; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.responsables (
    id_responsable integer NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.responsables OWNER TO cocodi_user;

--
-- Name: responsables_id_responsable_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.responsables_id_responsable_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.responsables_id_responsable_seq OWNER TO cocodi_user;

--
-- Name: responsables_id_responsable_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.responsables_id_responsable_seq OWNED BY public.responsables.id_responsable;


--
-- Name: sesiones; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.sesiones (
    id_sesion integer NOT NULL,
    id_institucion integer NOT NULL,
    id_tipo_organo integer NOT NULL,
    id_tipo_sesion integer NOT NULL,
    "año" integer NOT NULL,
    numero_ordinal integer,
    nombre_oficial_sesion character varying(255),
    estatus character varying(50) DEFAULT 'Programada'::character varying NOT NULL,
    fecha_programada date,
    fecha_realizada date,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.sesiones OWNER TO cocodi_user;

--
-- Name: sesiones_id_sesion_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.sesiones_id_sesion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sesiones_id_sesion_seq OWNER TO cocodi_user;

--
-- Name: sesiones_id_sesion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.sesiones_id_sesion_seq OWNED BY public.sesiones.id_sesion;


--
-- Name: tipos_informe; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.tipos_informe (
    id_tipo_informe integer NOT NULL,
    nombre_informe character varying(255) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.tipos_informe OWNER TO cocodi_user;

--
-- Name: tipos_informe_id_tipo_informe_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.tipos_informe_id_tipo_informe_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tipos_informe_id_tipo_informe_seq OWNER TO cocodi_user;

--
-- Name: tipos_informe_id_tipo_informe_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.tipos_informe_id_tipo_informe_seq OWNED BY public.tipos_informe.id_tipo_informe;


--
-- Name: tipos_organo_gobierno; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.tipos_organo_gobierno (
    id_tipo_organo integer NOT NULL,
    nombre character varying(255) NOT NULL,
    id_padre integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    usuario_creacion character varying(100),
    fecha_actualizacion timestamp with time zone DEFAULT now(),
    usuario_actualizacion character varying(100),
    activo boolean DEFAULT true
);


ALTER TABLE public.tipos_organo_gobierno OWNER TO cocodi_user;

--
-- Name: tipos_organo_gobierno_id_tipo_organo_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.tipos_organo_gobierno_id_tipo_organo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tipos_organo_gobierno_id_tipo_organo_seq OWNER TO cocodi_user;

--
-- Name: tipos_organo_gobierno_id_tipo_organo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.tipos_organo_gobierno_id_tipo_organo_seq OWNED BY public.tipos_organo_gobierno.id_tipo_organo;


--
-- Name: tipos_sesion; Type: TABLE; Schema: public; Owner: cocodi_user
--

CREATE TABLE public.tipos_sesion (
    id_tipo_sesion integer NOT NULL,
    nombre_sesion character varying(100) NOT NULL,
    activo boolean DEFAULT true
);


ALTER TABLE public.tipos_sesion OWNER TO cocodi_user;

--
-- Name: tipos_sesion_id_tipo_sesion_seq; Type: SEQUENCE; Schema: public; Owner: cocodi_user
--

CREATE SEQUENCE public.tipos_sesion_id_tipo_sesion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tipos_sesion_id_tipo_sesion_seq OWNER TO cocodi_user;

--
-- Name: tipos_sesion_id_tipo_sesion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cocodi_user
--

ALTER SEQUENCE public.tipos_sesion_id_tipo_sesion_seq OWNED BY public.tipos_sesion.id_tipo_sesion;


--
-- Name: dgs id_dg; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.dgs ALTER COLUMN id_dg SET DEFAULT nextval('public.dgs_id_dg_seq'::regclass);


--
-- Name: directorio_contactos id_contacto; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.directorio_contactos ALTER COLUMN id_contacto SET DEFAULT nextval('public.directorio_contactos_id_contacto_seq'::regclass);


--
-- Name: evidencias id_evidencia; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.evidencias ALTER COLUMN id_evidencia SET DEFAULT nextval('public.evidencias_id_evidencia_seq'::regclass);


--
-- Name: informes id_informe; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.informes ALTER COLUMN id_informe SET DEFAULT nextval('public.informes_id_informe_seq'::regclass);


--
-- Name: instituciones id_institucion; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones ALTER COLUMN id_institucion SET DEFAULT nextval('public.instituciones_id_institucion_seq'::regclass);


--
-- Name: naturalezas id_naturaleza; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas ALTER COLUMN id_naturaleza SET DEFAULT nextval('public.naturalezas_id_naturaleza_seq'::regclass);


--
-- Name: naturalezas_juridicas_desglose id_naturaleza_juridica; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas_juridicas_desglose ALTER COLUMN id_naturaleza_juridica SET DEFAULT nextval('public.naturalezas_juridicas_desglose_id_naturaleza_juridica_seq'::regclass);


--
-- Name: ramos id_ramo; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.ramos ALTER COLUMN id_ramo SET DEFAULT nextval('public.ramos_id_ramo_seq'::regclass);


--
-- Name: recomendaciones id_recomendacion; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.recomendaciones ALTER COLUMN id_recomendacion SET DEFAULT nextval('public.recomendaciones_id_recomendacion_seq'::regclass);


--
-- Name: responsables id_responsable; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.responsables ALTER COLUMN id_responsable SET DEFAULT nextval('public.responsables_id_responsable_seq'::regclass);


--
-- Name: sesiones id_sesion; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.sesiones ALTER COLUMN id_sesion SET DEFAULT nextval('public.sesiones_id_sesion_seq'::regclass);


--
-- Name: tipos_informe id_tipo_informe; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_informe ALTER COLUMN id_tipo_informe SET DEFAULT nextval('public.tipos_informe_id_tipo_informe_seq'::regclass);


--
-- Name: tipos_organo_gobierno id_tipo_organo; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_organo_gobierno ALTER COLUMN id_tipo_organo SET DEFAULT nextval('public.tipos_organo_gobierno_id_tipo_organo_seq'::regclass);


--
-- Name: tipos_sesion id_tipo_sesion; Type: DEFAULT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_sesion ALTER COLUMN id_tipo_sesion SET DEFAULT nextval('public.tipos_sesion_id_tipo_sesion_seq'::regclass);


--
-- Data for Name: dgs; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.dgs (id_dg, nombre_dg, siglas_dg, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	Dirección General de Prevención de la Corrupción y Mejora Continua 1	DG1	2025-11-03 22:05:48.902579+00	script_inicial	2025-11-03 22:05:48.902579+00	\N	t
2	Dirección General de Prevención de la Corrupción y Mejora Continua 2	DG2	2025-11-03 22:05:48.902579+00	script_inicial	2025-11-03 22:05:48.902579+00	\N	t
3	Dirección General de Prevención de la Corrupción y Mejora Continua 3	DG3	2025-11-03 22:05:48.902579+00	script_inicial	2025-11-03 22:05:48.902579+00	\N	t
4	Dirección General de Prevención de la Corrupción y Mejora Continua 4	DG4	2025-11-03 22:05:48.902579+00	script_inicial	2025-11-03 22:05:48.902579+00	\N	t
\.


--
-- Data for Name: directorio_contactos; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.directorio_contactos (id_contacto, id_institucion, id_tipo_organo, nombre_contacto, telefono, extension, email, movil, direccion, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
\.


--
-- Data for Name: evidencias; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.evidencias (id_evidencia, parent_id, parent_type, nombre_archivo, url_almacenamiento, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
\.


--
-- Data for Name: informes; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.informes (id_informe, id_institucion, id_tipo_organo, id_tipo_informe, periodicidad, periodo_reportado, fecha_informe, descripcion, recomendaciones_emitidas, recomendaciones_atendidas, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	52	2	2	No especificado	2024	2025-02-21	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
2	45	2	2	No especificado	2024	2025-03-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
3	24	2	2	No especificado	2024	2025-03-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
4	25	2	2	No especificado	2024	2025-03-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
5	30	2	2	No especificado	2024	2025-03-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
6	31	2	2	No especificado	2024	2025-03-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
7	39	2	2	No especificado	2024	2025-03-18	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
8	53	2	2	No especificado	2024	2025-03-19	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
9	17	2	2	No especificado	2024	2025-03-19	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
10	46	2	2	No especificado	2024	2025-03-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
11	47	2	2	No especificado	2024	2025-03-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
12	48	2	2	No especificado	2024	2025-03-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
13	29	2	2	No especificado	2024	2025-03-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
14	29	2	3	No especificado	2024	2025-03-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
15	68	2	2	No especificado	2024	2025-04-01	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
16	68	2	3	No especificado	2024	2025-04-01	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
17	66	2	2	No especificado	2024	2025-04-02	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
18	66	2	3	No especificado	2024	2025-04-02	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
19	27	2	2	No especificado	2024	2025-04-03	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
20	27	2	3	No especificado	2024	2025-04-03	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
21	38	2	2	No especificado	2024	2025-04-04	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
22	38	2	3	No especificado	2024	2025-04-04	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
23	18	2	2	No especificado	2024	2025-04-04	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
24	18	2	3	No especificado	2024	2025-04-04	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
25	64	2	2	No especificado	2024	2025-04-08	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
26	64	2	3	No especificado	2024	2025-04-08	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
27	43	2	2	No especificado	2024	2025-04-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
28	13	2	2	No especificado	2024	2025-04-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
29	13	2	3	No especificado	2024	2025-04-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
30	58	2	2	No especificado	2024	2025-04-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
31	58	2	3	No especificado	2024	2025-04-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
32	55	2	2	No especificado	2024	2025-04-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
33	55	2	3	No especificado	2024	2025-04-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
34	56	2	2	No especificado	2024	2025-04-16	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
35	56	2	3	No especificado	2024	2025-04-16	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
36	57	2	2	No especificado	2024	2025-04-16	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
37	57	2	3	No especificado	2024	2025-04-16	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
38	25	2	3	No especificado	2024	2025-04-28	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
39	30	2	3	No especificado	2024	2025-04-28	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
40	31	2	3	No especificado	2024	2025-05-07	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
41	21	1	1	No especificado	2025	2025-05-08	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
42	52	2	3	No especificado	2024	2025-05-23	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
43	37	1	1	No especificado	2025	2025-05-29	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
44	40	1	1	No especificado	2025	2025-05-29	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
45	50	1	1	No especificado	2025	2025-05-30	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
46	44	1	1	No especificado	2025	2025-06-02	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
47	35	1	1	No especificado	2025	2025-06-03	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
48	59	1	1	No especificado	2025	2025-06-04	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
49	62	1	1	No especificado	2025	2025-06-05	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
50	28	2	2	No especificado	2024	2025-06-05	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
51	28	2	3	No especificado	2024	2025-06-05	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
52	36	1	1	No especificado	2025	2025-06-06	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
53	61	1	1	No especificado	2025	2025-06-06	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
54	14	1	1	No especificado	2025	2025-06-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
55	12	2	2	No especificado	2024	2025-06-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
56	12	2	3	No especificado	2024	2025-06-10	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
57	17	2	3	No especificado	2024	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
58	26	2	2	No especificado	2024	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
59	26	2	3	No especificado	2024	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
60	45	2	3	No especificado	2024	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
61	60	1	1	No especificado	2025	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
62	39	2	3	No especificado	2024	2025-06-11	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
63	63	1	1	No especificado	2025	2025-06-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
64	16	1	1	No especificado	2025	2025-06-17	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
65	43	2	3	No especificado	2024	2025-06-18	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
66	23	2	2	No especificado	2024	2025-06-19	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
67	23	2	3	No especificado	2024	2025-06-19	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
68	8	1	1	No especificado	2025	2025-06-19	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
69	65	2	3	No especificado	2024	2025-06-20	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
70	65	2	2	No especificado	2024	2025-06-20	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
71	15	1	1	No especificado	2025	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
72	46	2	3	No especificado	2024	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
73	47	2	3	No especificado	2024	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
74	48	2	3	No especificado	2024	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
75	49	2	2	No especificado	2024	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
76	49	2	3	No especificado	2024	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
77	20	1	1	No especificado	2025	2025-06-25	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
78	2	1	1	No especificado	2025	2025-06-26	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
79	53	2	3	No especificado	2024	2025-07-16	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
80	54	1	1	No especificado	2025	2025-07-18	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
81	34	1	1	No especificado	2025	2025-08-20	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
89	51	2	2	No especificado	2024	2025-08-13	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
104	24	2	3	No especificado	2024	2025-09-12	\N	0	0	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
82	38	2	2	No especificado	2025	2025-09-02	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
83	58	2	2	No especificado	2025	2025-09-04	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
84	39	2	2	No especificado	2025	2025-09-10	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
85	64	2	2	No especificado	2025	2025-09-15	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
86	55	2	2	No especificado	2025	2025-09-18	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
87	57	2	2	No especificado	2025	2025-09-22	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
88	51	2	2	No especificado	2025	2025-09-24	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
90	52	2	2	No especificado	2025	2025-09-03	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
91	25	2	2	No especificado	2025	2025-09-11	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
92	30	2	2	No especificado	2025	2025-09-11	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
93	31	2	2	No especificado	2025	2025-09-11	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
94	46	2	2	No especificado	2025	2025-09-23	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
95	47	2	2	No especificado	2025	2025-09-23	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
96	48	2	2	No especificado	2025	2025-09-23	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
97	68	2	2	No especificado	2025	2025-09-26	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
98	66	2	2	No especificado	2025	2025-09-18	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
99	13	2	2	No especificado	2025	2025-09-04	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
100	12	2	2	No especificado	2025	2025-09-25	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
101	26	2	2	No especificado	2025	2025-09-10	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
102	65	2	2	No especificado	2025	2025-09-24	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
103	29	2	2	No especificado	2025	2025-09-30	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
105	17	2	2	No especificado	2025	2025-09-30	\N	0	10	2025-11-03 22:09:31.323672+00	carga_masiva	2025-11-03 22:09:31.323672+00	\N	t
\.


--
-- Data for Name: institucion_organos; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.institucion_organos (id_institucion, id_tipo_organo, fecha_creacion, usuario_creacion) FROM stdin;
2	1	2025-11-03 22:05:48.933649+00	\N
8	1	2025-11-03 22:05:48.933649+00	\N
12	1	2025-11-03 22:05:48.933649+00	\N
12	2	2025-11-03 22:05:48.933649+00	\N
13	1	2025-11-03 22:05:48.933649+00	\N
13	2	2025-11-03 22:05:48.933649+00	\N
14	1	2025-11-03 22:05:48.933649+00	\N
15	1	2025-11-03 22:05:48.933649+00	\N
16	1	2025-11-03 22:05:48.933649+00	\N
16	2	2025-11-03 22:05:48.933649+00	\N
17	1	2025-11-03 22:05:48.933649+00	\N
17	2	2025-11-03 22:05:48.933649+00	\N
18	1	2025-11-03 22:05:48.933649+00	\N
18	2	2025-11-03 22:05:48.933649+00	\N
20	1	2025-11-03 22:05:48.933649+00	\N
20	2	2025-11-03 22:05:48.933649+00	\N
21	1	2025-11-03 22:05:48.933649+00	\N
21	2	2025-11-03 22:05:48.933649+00	\N
22	3	2025-11-03 22:05:48.933649+00	\N
23	1	2025-11-03 22:05:48.933649+00	\N
23	2	2025-11-03 22:05:48.933649+00	\N
24	1	2025-11-03 22:05:48.933649+00	\N
24	2	2025-11-03 22:05:48.933649+00	\N
25	1	2025-11-03 22:05:48.933649+00	\N
25	2	2025-11-03 22:05:48.933649+00	\N
25	4	2025-11-03 22:05:48.933649+00	\N
26	1	2025-11-03 22:05:48.933649+00	\N
26	2	2025-11-03 22:05:48.933649+00	\N
27	1	2025-11-03 22:05:48.933649+00	\N
27	2	2025-11-03 22:05:48.933649+00	\N
28	1	2025-11-03 22:05:48.933649+00	\N
28	2	2025-11-03 22:05:48.933649+00	\N
29	1	2025-11-03 22:05:48.933649+00	\N
29	2	2025-11-03 22:05:48.933649+00	\N
29	4	2025-11-03 22:05:48.933649+00	\N
30	1	2025-11-03 22:05:48.933649+00	\N
30	2	2025-11-03 22:05:48.933649+00	\N
30	4	2025-11-03 22:05:48.933649+00	\N
31	1	2025-11-03 22:05:48.933649+00	\N
31	2	2025-11-03 22:05:48.933649+00	\N
32	1	2025-11-03 22:05:48.933649+00	\N
32	2	2025-11-03 22:05:48.933649+00	\N
33	2	2025-11-03 22:05:48.933649+00	\N
34	1	2025-11-03 22:05:48.933649+00	\N
35	1	2025-11-03 22:05:48.933649+00	\N
36	1	2025-11-03 22:05:48.933649+00	\N
37	1	2025-11-03 22:05:48.933649+00	\N
37	2	2025-11-03 22:05:48.933649+00	\N
38	1	2025-11-03 22:05:48.933649+00	\N
38	2	2025-11-03 22:05:48.933649+00	\N
39	1	2025-11-03 22:05:48.933649+00	\N
39	2	2025-11-03 22:05:48.933649+00	\N
40	1	2025-11-03 22:05:48.933649+00	\N
41	2	2025-11-03 22:05:48.933649+00	\N
41	3	2025-11-03 22:05:48.933649+00	\N
42	3	2025-11-03 22:05:48.933649+00	\N
43	1	2025-11-03 22:05:48.933649+00	\N
43	2	2025-11-03 22:05:48.933649+00	\N
44	1	2025-11-03 22:05:48.933649+00	\N
45	1	2025-11-03 22:05:48.933649+00	\N
45	2	2025-11-03 22:05:48.933649+00	\N
45	3	2025-11-03 22:05:48.933649+00	\N
46	2	2025-11-03 22:05:48.933649+00	\N
46	4	2025-11-03 22:05:48.933649+00	\N
47	1	2025-11-03 22:05:48.933649+00	\N
47	2	2025-11-03 22:05:48.933649+00	\N
47	4	2025-11-03 22:05:48.933649+00	\N
48	2	2025-11-03 22:05:48.933649+00	\N
48	4	2025-11-03 22:05:48.933649+00	\N
49	1	2025-11-03 22:05:48.933649+00	\N
49	2	2025-11-03 22:05:48.933649+00	\N
49	4	2025-11-03 22:05:48.933649+00	\N
50	1	2025-11-03 22:05:48.933649+00	\N
51	1	2025-11-03 22:05:48.933649+00	\N
51	2	2025-11-03 22:05:48.933649+00	\N
52	1	2025-11-03 22:05:48.933649+00	\N
52	2	2025-11-03 22:05:48.933649+00	\N
53	1	2025-11-03 22:05:48.933649+00	\N
53	2	2025-11-03 22:05:48.933649+00	\N
54	1	2025-11-03 22:05:48.933649+00	\N
55	1	2025-11-03 22:05:48.933649+00	\N
55	2	2025-11-03 22:05:48.933649+00	\N
55	4	2025-11-03 22:05:48.933649+00	\N
56	1	2025-11-03 22:05:48.933649+00	\N
56	2	2025-11-03 22:05:48.933649+00	\N
56	4	2025-11-03 22:05:48.933649+00	\N
57	1	2025-11-03 22:05:48.933649+00	\N
57	2	2025-11-03 22:05:48.933649+00	\N
57	4	2025-11-03 22:05:48.933649+00	\N
58	1	2025-11-03 22:05:48.933649+00	\N
58	2	2025-11-03 22:05:48.933649+00	\N
59	1	2025-11-03 22:05:48.933649+00	\N
59	2	2025-11-03 22:05:48.933649+00	\N
59	4	2025-11-03 22:05:48.933649+00	\N
60	1	2025-11-03 22:05:48.933649+00	\N
60	2	2025-11-03 22:05:48.933649+00	\N
61	1	2025-11-03 22:05:48.933649+00	\N
61	2	2025-11-03 22:05:48.933649+00	\N
62	1	2025-11-03 22:05:48.933649+00	\N
62	2	2025-11-03 22:05:48.933649+00	\N
63	1	2025-11-03 22:05:48.933649+00	\N
63	2	2025-11-03 22:05:48.933649+00	\N
64	1	2025-11-03 22:05:48.933649+00	\N
64	2	2025-11-03 22:05:48.933649+00	\N
64	4	2025-11-03 22:05:48.933649+00	\N
65	1	2025-11-03 22:05:48.933649+00	\N
65	2	2025-11-03 22:05:48.933649+00	\N
66	1	2025-11-03 22:05:48.933649+00	\N
66	2	2025-11-03 22:05:48.933649+00	\N
67	2	2025-11-03 22:05:48.933649+00	\N
68	1	2025-11-03 22:05:48.933649+00	\N
68	2	2025-11-03 22:05:48.933649+00	\N
69	1	2025-11-03 22:05:48.933649+00	\N
1	1	2025-11-03 22:05:48.940205+00	\N
3	1	2025-11-03 22:05:48.940205+00	\N
4	1	2025-11-03 22:05:48.940205+00	\N
5	1	2025-11-03 22:05:48.940205+00	\N
6	1	2025-11-03 22:05:48.940205+00	\N
7	1	2025-11-03 22:05:48.940205+00	\N
9	1	2025-11-03 22:05:48.940205+00	\N
10	1	2025-11-03 22:05:48.940205+00	\N
11	1	2025-11-03 22:05:48.940205+00	\N
19	1	2025-11-03 22:05:48.940205+00	\N
39	14	2025-11-03 22:05:48.943787+00	bitacora_historica
33	9	2025-11-03 22:05:48.943787+00	bitacora_historica
20	13	2025-11-03 22:05:48.943787+00	bitacora_historica
24	11	2025-11-03 22:05:48.943787+00	bitacora_historica
26	9	2025-11-03 22:05:48.943787+00	bitacora_historica
17	15	2025-11-03 22:05:48.943787+00	bitacora_historica
27	14	2025-11-03 22:05:48.943787+00	bitacora_historica
29	15	2025-11-03 22:05:48.943787+00	bitacora_historica
23	15	2025-11-03 22:05:48.943787+00	bitacora_historica
31	10	2025-11-03 22:05:48.943787+00	bitacora_historica
41	9	2025-11-03 22:05:48.943787+00	bitacora_historica
66	15	2025-11-03 22:05:48.943787+00	bitacora_historica
37	13	2025-11-03 22:05:48.943787+00	bitacora_historica
45	9	2025-11-03 22:05:48.943787+00	bitacora_historica
55	11	2025-11-03 22:05:48.943787+00	bitacora_historica
56	10	2025-11-03 22:05:48.943787+00	bitacora_historica
57	10	2025-11-03 22:05:48.943787+00	bitacora_historica
22	16	2025-11-03 22:05:48.943787+00	bitacora_historica
58	9	2025-11-03 22:05:48.943787+00	bitacora_historica
65	9	2025-11-03 22:05:48.943787+00	bitacora_historica
68	12	2025-11-03 22:05:48.943787+00	bitacora_historica
61	7	2025-11-03 22:05:48.943787+00	bitacora_historica
62	7	2025-11-03 22:05:48.943787+00	bitacora_historica
60	7	2025-11-03 22:05:48.943787+00	bitacora_historica
59	7	2025-11-03 22:05:48.943787+00	bitacora_historica
45	6	2025-11-03 22:05:48.943787+00	bitacora_historica
16	13	2025-11-03 22:05:48.943787+00	bitacora_historica
28	14	2025-11-03 22:05:48.943787+00	bitacora_historica
13	14	2025-11-03 22:05:48.943787+00	bitacora_historica
38	14	2025-11-03 22:05:48.943787+00	bitacora_historica
25	10	2025-11-03 22:05:48.943787+00	bitacora_historica
30	10	2025-11-03 22:05:48.943787+00	bitacora_historica
53	14	2025-11-03 22:05:48.943787+00	bitacora_historica
21	13	2025-11-03 22:05:48.943787+00	bitacora_historica
46	10	2025-11-03 22:05:48.943787+00	bitacora_historica
48	10	2025-11-03 22:05:48.943787+00	bitacora_historica
49	10	2025-11-03 22:05:48.943787+00	bitacora_historica
29	5	2025-11-03 22:05:48.943787+00	bitacora_historica
42	8	2025-11-03 22:05:48.943787+00	bitacora_historica
18	14	2025-11-03 22:05:48.943787+00	bitacora_historica
64	10	2025-11-03 22:05:48.943787+00	bitacora_historica
43	14	2025-11-03 22:05:48.943787+00	bitacora_historica
63	7	2025-11-03 22:05:48.943787+00	bitacora_historica
55	5	2025-11-03 22:05:48.943787+00	bitacora_historica
12	14	2025-11-03 22:05:48.943787+00	bitacora_historica
32	14	2025-11-03 22:05:48.943787+00	bitacora_historica
31	4	2025-11-03 22:05:48.943787+00	bitacora_historica
41	17	2025-11-03 22:05:48.943787+00	bitacora_historica
47	10	2025-11-03 22:05:48.943787+00	bitacora_historica
70	9	2025-11-03 22:05:48.943787+00	bitacora_historica
\.


--
-- Data for Name: institucion_tipo_informe_valido; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.institucion_tipo_informe_valido (id_institucion, id_tipo_informe, fecha_creacion, usuario_creacion) FROM stdin;
1	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
2	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
3	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
4	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
5	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
6	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
7	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
8	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
9	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
10	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
11	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
14	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
15	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
16	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
19	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
20	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
21	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
34	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
35	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
36	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
37	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
40	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
44	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
50	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
54	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
59	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
60	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
61	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
62	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
63	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
69	1	2025-11-03 22:05:48.947521+00	script_reglas_validadas
12	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
13	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
17	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
18	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
22	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
23	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
24	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
25	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
26	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
27	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
28	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
29	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
30	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
31	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
32	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
33	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
38	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
39	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
41	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
42	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
43	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
45	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
46	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
47	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
48	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
49	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
51	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
52	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
53	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
55	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
56	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
57	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
58	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
64	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
65	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
66	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
67	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
68	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
70	2	2025-11-03 22:05:48.95247+00	script_reglas_validadas
12	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
13	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
17	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
18	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
22	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
23	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
24	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
25	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
26	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
27	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
28	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
29	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
30	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
31	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
32	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
33	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
38	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
39	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
41	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
42	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
43	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
45	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
46	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
47	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
48	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
49	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
51	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
52	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
53	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
55	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
56	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
57	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
58	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
64	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
65	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
66	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
67	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
68	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
70	3	2025-11-03 22:05:48.955843+00	script_reglas_validadas
\.


--
-- Data for Name: instituciones; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.instituciones (id_institucion, nombre_institucion, siglas, id_ramo, id_naturaleza, id_naturaleza_juridica, id_responsable, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	Oficina de la Presidencia de la República	OPR	1	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
2	Secretaría de Gobernación	GOBERNACIÓN	2	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
3	Centro de Producción de Programas Informativos y Especiales	CEPROPIE	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
4	Comisión Nacional de Búsqueda de Personas	CNB	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
5	Comisión Nacional para Prevenir y Erradicar la violencia contra las mujeres	CONAVIM	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
6	Coordinación General de la Comisión Mexicana de Ayuda a Refugiados	COMAR	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
7	Coordinación para la Atención Integral de la Migración en la Frontera Sur	CAIMFS	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
8	Instituto Nacional de Migración	INM	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
9	Instituto Nacional para el Federalismo y el Desarrollo Municipal	INAFED	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
10	Secretaría Ejecutiva del Sistema Nacional de Protección Integral de Niñas, Niños y Adolescentes	SIPPINA	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
11	Secretaría General del Consejo Nacional de Población	CONAPO	2	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
12	Talleres Gráficos de México	TGM	2	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
13	Consejo Nacional para Prevenir la Discriminación	CONAPRED	2	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
14	Secretaría de Agricultura y Desarrollo Rural	SADER	3	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
15	Colegio Superior Agropecuario del Estado de Guerrero	CSAEGRO	3	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
16	Comisión Nacional de Acuacultura y Pesca	CONAPESCA	3	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
17	Comité Nacional para el Desarrollo Sustentable de la Caña de Azúcar	CONADESUCA	3	3	3	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
18	Productora Nacional de Biológicos Veterinarios	PRONABIVE	3	3	3	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
19	Servicio de Información Agroalimentaria y Pesquera	SIAP	3	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
20	Servicio Nacional de Inspección y Certificación de Semillas	SNICS	3	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
21	Servicio Nacional de Sanidad, Inocuidad y Calidad Agroalimentaria	SENASICA	3	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
22	Sistema Nacional de Sanidad, Inocuidad y Calidad Agropecuaria y Alimentaría	SINASICA	3	4	5	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
23	Colegio de Postgraduados	COLPOS	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
24	Comisión Nacional de las Zonas Áridas	CONAZA	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
25	Alimentación para el Bienestar, S.A. de C.V.	AB	3	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
26	Fideicomiso de Riesgo Compartido	FIRCO	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
27	Instituto Mexicano de Investigación en Pesca y Acuacultura Sustentables	IMIPAS	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
28	Instituto Nacional de Investigaciones Forestales, Agrícolas y Pecuarias	INIFAP	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
29	Instituto Nacional para el Desarrollo de Capacidades del Sector Rural, A.C.	INCA RURAL	3	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
30	Leche par el Bienestar, S.A. de C.V.	LB	3	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
31	Seguridad Alimentaria Mexicana	SEGALMEX	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
32	Productora de Semillas para el Bienestar	PROSEBIEN	3	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
33	Fideicomiso de Investigación para el desarrollo del Programa Nacional de aprovechamiento del Atún y Protección de Delfines y otros en torno a Especies Acuáticas protegidas	FIDEMAR	3	3	6	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
34	Secretaría de Medio Ambiente y Recursos Naturales	SEMARNAT	4	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
35	Agencia Nacional de Seguridad Industrial y de Protección al Medio Ambiente del Sector Hidrocarburos	ASEA	4	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
36	Comisión Nacional de Áreas Naturales Protegidas	CONANP	4	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
37	Comisión Nacional del Agua	CONAGUA	4	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
38	Instituto Mexicano de Tecnología del Agua	IMTA	4	3	3	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
39	Instituto Nacional de Ecología y Cambio Climático	INECC	4	3	3	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
40	Procuraduría Federal de Protección al Ambiente	PROFEPA	4	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
41	Fideicomiso para Apoyar los Programas, Proyectos y Acciones Ambientales de la Megalópolis	Fideicomiso 1490	4	3	6	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
42	Comisión Intersecretarial para la Atención de Sequías e Inundaciones	CIASI	4	4	7	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
43	Comisión Nacional Forestal	CONAFOR	4	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
44	Secretaría de Turismo	TURISMO	5	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
45	Fondo Nacional de Fomento al Turismo	FONATUR	5	3	6	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
46	FONATUR Constructora, S.A. de C.V.	FONATUR CONSTRUCTORA	5	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
47	FONATUR Infraestructura, S.A. de C.V.	FONATUR INFRAESTRUCTURA	5	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
48	FONATUR Solar, S.A. de C.V.	FONATUR SOLAR	5	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
49	FONATUR Tren Maya, S.A. de C.V.	FTM	5	3	4	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
50	Consejería Jurídica del Ejecutivo Federal	CJEF	6	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
51	Secretaría Ejecutiva del Sistema Nacional Anticorrupción	SESNA	7	1	3	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
52	Archivo General de la Nación	AGN	7	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
53	Comisión Ejecutiva de Atención a Víctimas	CEAV	7	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
54	Secretaría de Cultura	CULTURA	8	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
55	Centro de Capacitación Cinematográfica, A.C.	CCC	8	3	4	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
56	Compañía Operadora del Centro Cultural y Turístico de Tijuana, S.A. de C.V.	CECUT	8	3	4	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
57	Estudios Churubusco Azteca, S.A.	ECHASA	8	3	4	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
58	Fideicomiso para la Cineteca Nacional	FICINE	8	3	6	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
59	Instituto Nacional de Antropología e Historia	INAH	8	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
60	Instituto Nacional de Bellas Artes y Literatura	INBAL	8	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
61	Instituto Nacional de Estudios Históricos de las Revoluciones de México	INEHRM	8	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
62	Instituto Nacional del Derecho de Autor	INDAUTOR	8	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
63	Radio Educación	RADIO EDU	8	2	2	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
64	Televisión Metropolitana, S.A. de C.V.	CANAL 22	8	3	4	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
65	Fondo Nacional para el Fomento de las Artesanías	FONART	8	3	8	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
66	Instituto Mexicano de Cinematografía	IMCINE	8	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
67	Fondo de Inversión y Estímulos al Cine	FIDECINE	8	3	8	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
68	Instituto Nacional de Lenguas Indígenas	INALI	8	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
69	Secretaría de las Mujeres	MUJERES	9	1	1	1	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
70	Fideicomiso de Inversión y Estímulos al Cine	FIMCINE	8	3	3	2	2025-11-03 22:05:48.923722+00	script_inicial	2025-11-03 22:05:48.923722+00	\N	t
\.


--
-- Data for Name: naturalezas; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.naturalezas (id_naturaleza, nombre) FROM stdin;
1	Dependencia
2	Desconcentrado
3	Entidad
4	Intersecretarial
\.


--
-- Data for Name: naturalezas_juridicas_desglose; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.naturalezas_juridicas_desglose (id_naturaleza_juridica, nombre, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	Dependencia	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
2	Desconcentrado	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
3	Descentralizado	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
4	Empresa de Participación Estatal Mayoritaria	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
5	Estructura organizativa y operativa	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
6	Fideicomiso Público	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
7	órgano de coordinación	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
8	Fideicomiso con Estructura	2025-11-03 22:05:48.910614+00	script_inicial	2025-11-03 22:05:48.910614+00	\N	t
\.


--
-- Data for Name: ramos; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.ramos (id_ramo, numero_ramo, nombre_ramo, id_dg, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	02	Oficina de la Presidencia de la República	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
2	04	Gobernación	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
3	08	Agricultura y Desarrollo Rural	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
4	16	Medio Ambiente y Recursos Naturales	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
5	21	Turismo	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
6	37	Consejería Jurídica del Ejecutivo Federal	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
7	47	Entidades No Sectorizadas	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
8	48	Cultura	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
9	54	Mujeres	4	2025-11-03 22:05:48.90461+00	script_inicial	2025-11-03 22:05:48.90461+00	\N	t
\.


--
-- Data for Name: recomendaciones; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.recomendaciones (id_recomendacion, id_informe, id_institucion, id_tipo_organo, descripcion, area_responsable_atencion, fecha_emision, fecha_compromiso, estatus, prioridad, tipo_recomendacion, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
\.


--
-- Data for Name: responsables; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.responsables (id_responsable, nombre, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	Delegada	2025-11-03 22:05:48.900203+00	script_inicial	2025-11-03 22:05:48.900203+00	\N	t
2	Comisaria	2025-11-03 22:05:48.900203+00	script_inicial	2025-11-03 22:05:48.900203+00	\N	t
\.


--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.sesiones (id_sesion, id_institucion, id_tipo_organo, id_tipo_sesion, "año", numero_ordinal, nombre_oficial_sesion, estatus, fecha_programada, fecha_realizada, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	39	14	2	2024	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2024-10-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
2	24	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
3	34	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
4	65	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
5	23	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
6	21	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
7	29	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-15	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
8	18	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-15	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
9	19	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
10	39	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
11	33	9	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
12	20	13	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
13	15	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
14	17	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
15	28	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
16	26	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-11-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
17	14	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
18	24	11	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
19	16	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
20	40	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
21	20	1	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
22	39	14	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
23	33	9	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
24	26	9	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
25	17	15	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
26	27	14	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
27	16	13	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
28	20	13	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
29	29	15	1	2024	\N	Sesión Histórica - Ordinaria	Realizada	\N	2024-12-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
30	23	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
31	31	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
32	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
33	41	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-01-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
34	66	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
35	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
36	39	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-01-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
37	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
38	28	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
39	55	11	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
40	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
41	57	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
42	24	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
43	39	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
44	43	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
45	66	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
46	52	2	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
47	56	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
48	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
49	34	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
50	51	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
51	47	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-02-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
52	12	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
53	13	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
54	31	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
55	25	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
56	30	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
57	44	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
58	21	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-02-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
59	55	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
60	68	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
61	14	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
62	40	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
63	23	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
64	15	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
65	36	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
66	38	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
67	61	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
68	47	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-07	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
69	60	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-07	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
70	64	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-07	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
71	66	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
72	29	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
73	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
74	65	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
75	53	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
76	33	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
77	35	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
78	24	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
79	28	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
80	26	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
81	31	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
82	25	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
83	62	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
84	18	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
85	30	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
86	13	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
87	55	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
88	17	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
89	56	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
90	51	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
91	22	16	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
92	26	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
93	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
94	57	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
95	39	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
96	27	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
97	52	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
98	45	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
99	58	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
100	53	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
101	47	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
102	49	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
103	37	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
104	17	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
105	8	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
106	21	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
107	50	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
108	63	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
109	46	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
110	47	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
111	48	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
112	49	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
113	29	5	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
114	16	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
115	56	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
116	59	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
117	51	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
118	41	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
119	30	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
120	23	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
121	37	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
122	20	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
123	42	8	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
124	65	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
125	2	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
126	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-03-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
127	69	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-03-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
128	68	12	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-01	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
129	28	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-01	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
130	66	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
131	27	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
132	61	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
133	51	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
134	54	1	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
135	38	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
136	18	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
137	64	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
138	43	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
139	13	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
140	58	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
141	62	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
142	55	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
143	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
144	20	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
145	60	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
146	63	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-15	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
147	56	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
148	57	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
149	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
150	54	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
151	25	4	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
152	30	4	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
153	55	5	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
154	16	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
155	57	4	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
156	31	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
157	25	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-04-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
158	56	4	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
159	64	4	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-04-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
160	59	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
161	41	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
162	21	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
163	30	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
164	38	1	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
165	12	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
166	29	5	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
167	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
168	39	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
169	34	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-15	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
170	25	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
171	31	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
172	25	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
173	30	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
174	52	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
175	43	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
176	52	2	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
177	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
178	64	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
179	55	11	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
180	45	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
181	28	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
182	58	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
183	38	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-05-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
184	18	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
185	26	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
186	47	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
187	49	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
188	53	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
189	37	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
190	40	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
191	50	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-05-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
192	44	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
193	35	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
194	59	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
195	28	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
196	31	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
197	25	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
198	30	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
199	38	1	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
200	62	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
201	36	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
202	61	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
203	32	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-09	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
204	68	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
205	12	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
206	14	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
207	45	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
208	26	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
209	66	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
210	17	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
211	60	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
212	39	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
213	29	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
214	37	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
215	63	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
216	64	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
217	33	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
218	49	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
219	56	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
220	51	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
221	17	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
222	57	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
223	55	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
224	16	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
225	51	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
226	29	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
227	65	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
228	43	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
229	23	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
230	12	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
231	13	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
232	8	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
233	42	8	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
234	13	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
235	21	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
236	41	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
237	45	6	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
238	65	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
239	27	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-24	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
240	52	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-24	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
241	20	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
242	15	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
243	46	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
244	47	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
245	48	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
246	49	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
247	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
248	23	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
249	2	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
250	69	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
251	58	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
252	21	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
253	37	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
254	12	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
255	38	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
256	29	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-06-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
257	46	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-06-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
258	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-01	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
259	41	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
260	68	12	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
261	41	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
262	61	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
263	20	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
264	30	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
265	27	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
266	62	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-09	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
267	54	1	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
268	55	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
269	63	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
270	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
271	66	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-15	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
272	53	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
273	64	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
274	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-16	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
275	59	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
276	16	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
277	56	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
278	60	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
279	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
280	49	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
281	54	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
282	55	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
283	57	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
284	12	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
285	49	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
286	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
287	37	13	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-07-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
288	65	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-07-31	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
289	18	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-01	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
290	31	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
291	25	4	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
292	39	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-06	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
293	21	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-07	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
294	38	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
295	62	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
296	23	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-08	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
297	52	2	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
298	66	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
299	31	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
300	25	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
301	30	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-14	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
302	58	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
303	63	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
304	36	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
305	64	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
306	56	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
307	55	11	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-13	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
308	37	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
309	60	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
310	55	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
311	57	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
312	40	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
313	59	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
314	8	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-21	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
315	34	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
316	32	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
317	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
318	28	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
319	52	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-20	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
320	43	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
321	52	2	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
322	68	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
323	45	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
324	26	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
325	47	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
326	65	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
327	49	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-08-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
328	61	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
329	18	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
330	37	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-27	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
331	35	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-28	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
332	50	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
333	2	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-08-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
334	27	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
335	53	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
336	52	2	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
337	13	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
338	62	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
339	38	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
340	20	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
341	54	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-04	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
342	58	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-05	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
343	44	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
344	63	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
345	17	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
346	60	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
347	44	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
348	39	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-12	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
349	45	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-09	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
350	28	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-09	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
351	26	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
352	12	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
353	23	15	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-10	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
354	31	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
355	25	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
356	30	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
357	33	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
358	27	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-11	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
359	29	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
360	66	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
361	13	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
362	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
363	64	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-17	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
364	51	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
365	21	13	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
366	15	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-18	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
367	18	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-19	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
368	55	11	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
369	57	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
370	14	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
371	16	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-24	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
372	69	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
373	28	14	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-22	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
374	48	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
375	46	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
376	41	17	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
377	47	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
378	49	10	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-23	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
379	24	11	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-24	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
380	65	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-24	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
381	70	9	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
382	12	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
383	23	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-25	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
384	68	12	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-26	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
385	31	10	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-09-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
386	29	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
387	17	1	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-29	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
388	17	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
389	59	7	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-09-30	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
390	45	9	2	2025	\N	Sesión Histórica - Extraordinaria	Realizada	\N	2025-10-01	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
391	53	14	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-10-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
392	23	15	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-10-03	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
393	42	8	1	2025	\N	Sesión Histórica - Ordinaria	Realizada	\N	2025-10-02	2025-11-03 22:09:17.059635+00	carga_masiva	2025-11-03 22:09:17.059635+00	\N	t
\.


--
-- Data for Name: tipos_informe; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.tipos_informe (id_tipo_informe, nombre_informe, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	RAAD	2025-11-03 22:05:48.918439+00	script_inicial	2025-11-03 22:05:48.918439+00	\N	t
2	Informe de Autoevaluación	2025-11-03 22:05:48.918439+00	script_inicial	2025-11-03 22:05:48.918439+00	\N	t
3	Informe de Estados Financieros	2025-11-03 22:05:48.918439+00	script_inicial	2025-11-03 22:05:48.918439+00	\N	t
\.


--
-- Data for Name: tipos_organo_gobierno; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.tipos_organo_gobierno (id_tipo_organo, nombre, id_padre, fecha_creacion, usuario_creacion, fecha_actualizacion, usuario_actualizacion, activo) FROM stdin;
1	COCODI	\N	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
2	Órgano de Gobierno	\N	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
3	Otros Órganos Colegiados	2	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
4	Asamblea General de Accionistas	2	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
5	Asamblea General de Asociados	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
6	Comisión Ejecutiva	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
7	Comisión Interna de Administración	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
8	Comisión Intersecretarial	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
9	Comité Técnico	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
10	Consejo de Administración	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
11	Consejo Directivo	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
12	Consejo Nacional	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
13	Consejo Técnico	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
14	Junta de Gobierno	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
15	Junta Directiva	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
16	Sistema Intersecretarial	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
17	Subcomité de Evaluación	3	2025-11-03 22:05:48.912552+00	script_inicial	2025-11-03 22:05:48.912552+00	\N	t
\.


--
-- Data for Name: tipos_sesion; Type: TABLE DATA; Schema: public; Owner: cocodi_user
--

COPY public.tipos_sesion (id_tipo_sesion, nombre_sesion, activo) FROM stdin;
1	Ordinaria	t
2	Extraordinaria	t
\.


--
-- Name: dgs_id_dg_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.dgs_id_dg_seq', 1, false);


--
-- Name: directorio_contactos_id_contacto_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.directorio_contactos_id_contacto_seq', 1, false);


--
-- Name: evidencias_id_evidencia_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.evidencias_id_evidencia_seq', 1, false);


--
-- Name: informes_id_informe_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.informes_id_informe_seq', 105, true);


--
-- Name: instituciones_id_institucion_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.instituciones_id_institucion_seq', 1, false);


--
-- Name: naturalezas_id_naturaleza_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.naturalezas_id_naturaleza_seq', 1, false);


--
-- Name: naturalezas_juridicas_desglose_id_naturaleza_juridica_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.naturalezas_juridicas_desglose_id_naturaleza_juridica_seq', 1, false);


--
-- Name: ramos_id_ramo_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.ramos_id_ramo_seq', 1, false);


--
-- Name: recomendaciones_id_recomendacion_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.recomendaciones_id_recomendacion_seq', 1, false);


--
-- Name: responsables_id_responsable_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.responsables_id_responsable_seq', 1, false);


--
-- Name: sesiones_id_sesion_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.sesiones_id_sesion_seq', 393, true);


--
-- Name: tipos_informe_id_tipo_informe_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.tipos_informe_id_tipo_informe_seq', 1, false);


--
-- Name: tipos_organo_gobierno_id_tipo_organo_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.tipos_organo_gobierno_id_tipo_organo_seq', 1, false);


--
-- Name: tipos_sesion_id_tipo_sesion_seq; Type: SEQUENCE SET; Schema: public; Owner: cocodi_user
--

SELECT pg_catalog.setval('public.tipos_sesion_id_tipo_sesion_seq', 1, false);


--
-- Name: dgs dgs_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.dgs
    ADD CONSTRAINT dgs_pkey PRIMARY KEY (id_dg);


--
-- Name: dgs dgs_siglas_dg_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.dgs
    ADD CONSTRAINT dgs_siglas_dg_key UNIQUE (siglas_dg);


--
-- Name: directorio_contactos directorio_contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.directorio_contactos
    ADD CONSTRAINT directorio_contactos_pkey PRIMARY KEY (id_contacto);


--
-- Name: evidencias evidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.evidencias
    ADD CONSTRAINT evidencias_pkey PRIMARY KEY (id_evidencia);


--
-- Name: informes informes_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_pkey PRIMARY KEY (id_informe);


--
-- Name: institucion_organos institucion_organos_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_organos
    ADD CONSTRAINT institucion_organos_pkey PRIMARY KEY (id_institucion, id_tipo_organo);


--
-- Name: institucion_tipo_informe_valido institucion_tipo_informe_valido_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_tipo_informe_valido
    ADD CONSTRAINT institucion_tipo_informe_valido_pkey PRIMARY KEY (id_institucion, id_tipo_informe);


--
-- Name: instituciones instituciones_nombre_institucion_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_nombre_institucion_key UNIQUE (nombre_institucion);


--
-- Name: instituciones instituciones_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT instituciones_pkey PRIMARY KEY (id_institucion);


--
-- Name: naturalezas_juridicas_desglose naturalezas_juridicas_desglose_nombre_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas_juridicas_desglose
    ADD CONSTRAINT naturalezas_juridicas_desglose_nombre_key UNIQUE (nombre);


--
-- Name: naturalezas_juridicas_desglose naturalezas_juridicas_desglose_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas_juridicas_desglose
    ADD CONSTRAINT naturalezas_juridicas_desglose_pkey PRIMARY KEY (id_naturaleza_juridica);


--
-- Name: naturalezas naturalezas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas
    ADD CONSTRAINT naturalezas_nombre_key UNIQUE (nombre);


--
-- Name: naturalezas naturalezas_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.naturalezas
    ADD CONSTRAINT naturalezas_pkey PRIMARY KEY (id_naturaleza);


--
-- Name: ramos ramos_numero_ramo_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.ramos
    ADD CONSTRAINT ramos_numero_ramo_key UNIQUE (numero_ramo);


--
-- Name: ramos ramos_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.ramos
    ADD CONSTRAINT ramos_pkey PRIMARY KEY (id_ramo);


--
-- Name: recomendaciones recomendaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.recomendaciones
    ADD CONSTRAINT recomendaciones_pkey PRIMARY KEY (id_recomendacion);


--
-- Name: responsables responsables_nombre_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_nombre_key UNIQUE (nombre);


--
-- Name: responsables responsables_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_pkey PRIMARY KEY (id_responsable);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id_sesion);


--
-- Name: tipos_informe tipos_informe_nombre_informe_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_informe
    ADD CONSTRAINT tipos_informe_nombre_informe_key UNIQUE (nombre_informe);


--
-- Name: tipos_informe tipos_informe_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_informe
    ADD CONSTRAINT tipos_informe_pkey PRIMARY KEY (id_tipo_informe);


--
-- Name: tipos_organo_gobierno tipos_organo_gobierno_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_organo_gobierno
    ADD CONSTRAINT tipos_organo_gobierno_pkey PRIMARY KEY (id_tipo_organo);


--
-- Name: tipos_sesion tipos_sesion_nombre_sesion_key; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_sesion
    ADD CONSTRAINT tipos_sesion_nombre_sesion_key UNIQUE (nombre_sesion);


--
-- Name: tipos_sesion tipos_sesion_pkey; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_sesion
    ADD CONSTRAINT tipos_sesion_pkey PRIMARY KEY (id_tipo_sesion);


--
-- Name: sesiones uq_sesion_planeada; Type: CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT uq_sesion_planeada UNIQUE (id_institucion, id_tipo_organo, "año", id_tipo_sesion, numero_ordinal);


--
-- Name: ramos fk_dg; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.ramos
    ADD CONSTRAINT fk_dg FOREIGN KEY (id_dg) REFERENCES public.dgs(id_dg) ON DELETE CASCADE;


--
-- Name: directorio_contactos fk_directorio_institucion; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.directorio_contactos
    ADD CONSTRAINT fk_directorio_institucion FOREIGN KEY (id_institucion) REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE;


--
-- Name: directorio_contactos fk_directorio_organo_valido; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.directorio_contactos
    ADD CONSTRAINT fk_directorio_organo_valido FOREIGN KEY (id_institucion, id_tipo_organo) REFERENCES public.institucion_organos(id_institucion, id_tipo_organo) ON DELETE CASCADE;


--
-- Name: informes fk_informe_institucion_organo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.informes
    ADD CONSTRAINT fk_informe_institucion_organo FOREIGN KEY (id_institucion, id_tipo_organo) REFERENCES public.institucion_organos(id_institucion, id_tipo_organo);


--
-- Name: informes fk_informe_tipo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.informes
    ADD CONSTRAINT fk_informe_tipo FOREIGN KEY (id_tipo_informe) REFERENCES public.tipos_informe(id_tipo_informe);


--
-- Name: instituciones fk_institucion_naturaleza; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT fk_institucion_naturaleza FOREIGN KEY (id_naturaleza) REFERENCES public.naturalezas(id_naturaleza);


--
-- Name: instituciones fk_institucion_naturaleza_juridica; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT fk_institucion_naturaleza_juridica FOREIGN KEY (id_naturaleza_juridica) REFERENCES public.naturalezas_juridicas_desglose(id_naturaleza_juridica);


--
-- Name: instituciones fk_institucion_ramo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT fk_institucion_ramo FOREIGN KEY (id_ramo) REFERENCES public.ramos(id_ramo);


--
-- Name: instituciones fk_institucion_responsable; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.instituciones
    ADD CONSTRAINT fk_institucion_responsable FOREIGN KEY (id_responsable) REFERENCES public.responsables(id_responsable);


--
-- Name: tipos_organo_gobierno fk_padre_organo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.tipos_organo_gobierno
    ADD CONSTRAINT fk_padre_organo FOREIGN KEY (id_padre) REFERENCES public.tipos_organo_gobierno(id_tipo_organo);


--
-- Name: recomendaciones fk_recomendacion_informe; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.recomendaciones
    ADD CONSTRAINT fk_recomendacion_informe FOREIGN KEY (id_informe) REFERENCES public.informes(id_informe) ON DELETE SET NULL;


--
-- Name: recomendaciones fk_recomendacion_institucion_organo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.recomendaciones
    ADD CONSTRAINT fk_recomendacion_institucion_organo FOREIGN KEY (id_institucion, id_tipo_organo) REFERENCES public.institucion_organos(id_institucion, id_tipo_organo);


--
-- Name: sesiones fk_sesion_institucion_organo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT fk_sesion_institucion_organo FOREIGN KEY (id_institucion, id_tipo_organo) REFERENCES public.institucion_organos(id_institucion, id_tipo_organo);


--
-- Name: sesiones fk_sesion_tipo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT fk_sesion_tipo FOREIGN KEY (id_tipo_sesion) REFERENCES public.tipos_sesion(id_tipo_sesion);


--
-- Name: institucion_tipo_informe_valido fk_valido_institucion; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_tipo_informe_valido
    ADD CONSTRAINT fk_valido_institucion FOREIGN KEY (id_institucion) REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE;


--
-- Name: institucion_tipo_informe_valido fk_valido_tipo_informe; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_tipo_informe_valido
    ADD CONSTRAINT fk_valido_tipo_informe FOREIGN KEY (id_tipo_informe) REFERENCES public.tipos_informe(id_tipo_informe) ON DELETE CASCADE;


--
-- Name: institucion_organos fk_vinculo_institucion; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_organos
    ADD CONSTRAINT fk_vinculo_institucion FOREIGN KEY (id_institucion) REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE;


--
-- Name: institucion_organos fk_vinculo_organo; Type: FK CONSTRAINT; Schema: public; Owner: cocodi_user
--

ALTER TABLE ONLY public.institucion_organos
    ADD CONSTRAINT fk_vinculo_organo FOREIGN KEY (id_tipo_organo) REFERENCES public.tipos_organo_gobierno(id_tipo_organo) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict eOBYMRgUrgl200ArkhOSTo6tS10UFGSv56GIW6OAugP12BZqfkuUFGc1aTyrfOv

