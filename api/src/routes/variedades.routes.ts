import { asyncHandler } from '../http.js';
import { Router } from 'express';
import { pool } from '../db.js';
import { verificarToken, permitirRoles } from '../auth.js';
import { auditedQuery } from '../audit.js';
import { parseFields, InputError } from '../fieldRules.js';

const router = Router();
router.use(verificarToken);
// Catálogo compartido: lo leen Campo y también Producción (Enólogo).
router.use(permitirRoles('Administrador', 'Gerente', 'Agronomo', 'Enologo'));

// GET /api/variedades → catálogo de variedades de uva (para los menús desplegables)
router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM variedad_uva ORDER BY nombre');
  res.json(rows);
}));

router.post('/', permitirRoles('Administrador','Agronomo','Enologo'), asyncHandler(async (req,res) => {
  let input: Record<string,string|number|null>;
  try { input=parseFields({ nombre:{kind:'text',required:true,max:80}, caracteristicas:{kind:'text',max:255}, azucar_objetivo:{kind:'number',required:true,min:0.1,max:99.9} },req.body); }
  catch(error) { if(error instanceof InputError){ res.status(400).json({error:error.message});return;} throw error; }
  try {
    const [result]:any=await auditedQuery(req,'Campo','INSERT INTO variedad_uva (nombre,caracteristicas,azucar_objetivo) VALUES (?,?,?)',[input.nombre,input.caracteristicas,input.azucar_objetivo]);
    res.status(201).json({id_variedad:result.insertId});
  } catch(error:any){ if(error.code==='ER_DUP_ENTRY'){res.status(409).json({error:'Esa variedad ya existe'});return;}throw error; }
}));

export default router;
