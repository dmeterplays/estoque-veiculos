import * as XLSX from 'xlsx';

const ALIASES: Record<string, string[]> = {
  external_id: ['external_id', 'codigo', 'código', 'code', 'sku', 'referencia', 'referência', 'estoque_id'],
  brand: ['brand', 'marca', 'fabricante'],
  model: ['model', 'modelo', 'versao', 'versão'],
  year_manufacture: ['year_manufacture', 'ano_fabricacao', 'ano_fab', 'ano fabricação', 'ano de fabricação', 'anofabricacao'],
  year_model: ['year_model', 'ano_modelo', 'ano modelo', 'anomodelo', 'modelo_ano', 'ano'],
  km: ['km', 'quilometragem', 'quilo', 'odometro', 'odômetro'],
  price: ['price', 'preco', 'preço', 'valor', 'valor_venda', 'venda'],
  fuel: ['fuel', 'combustivel', 'combustível', 'tipo_combustivel'],
  transmission: ['transmission', 'cambio', 'câmbio', 'transmissao', 'transmissão', 'marcha'],
  condition: ['condition', 'condicao', 'condição', 'estado_veiculo', 'situacao', 'situação'],
  city: ['city', 'cidade', 'municipio', 'município'],
  state: ['state', 'uf', 'estado'],
  image: ['image', 'foto', 'foto_url', 'url_foto', 'imagem', 'imagem_url', 'url_imagem', 'picture', 'photo', 'fotourl'],
  description: ['description', 'descricao', 'descrição', 'obs', 'observacoes', 'observações', 'detalhes'],
  plate_end: ['plate_end', 'final_placa', 'final da placa', 'placa_final'],
  video_url: ['video_url', 'videourl', 'video', 'video_url', 'url_video'],
  color: ['color', 'cor', 'cor_externa'],
  colors: ['colors', 'cores', 'quantidades'],
  quantity: ['quantity', 'quantidade', 'qtd'],
};

function normalizeHeader(h: string): string {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function matchField(header: string): string | null {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (
      field === norm ||
      aliases.some((a) => normalizeHeader(a) === norm)
    ) {
      return field;
    }
  }
  return null;
}

export function parseRowToVehicle(
  row: Record<string, unknown>,
  index: number
): { vehicle: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const out: Record<string, unknown> = {};

  for (const [rawHeader, value] of Object.entries(row)) {
    const field = matchField(rawHeader);
    if (!field) continue;

    let v = value;
    if (typeof v === 'string') v = v.trim();

    switch (field) {
      case 'km':
      case 'price':
      case 'year_manufacture':
      case 'year_model': {
        const n = Number(v);
        if (v === '' || v === null || v === undefined) {
          errors.push(`linha ${index + 2}: campo obrigatório '${rawHeader}' vazio`);
        } else if (Number.isNaN(n)) {
          errors.push(`linha ${index + 2}: '${rawHeader}' não é um número ("${value}")`);
        } else {
          out[field] = n;
        }
        break;
      }
      case 'brand':
      case 'model':
      case 'city':
      case 'state':
      case 'fuel':
      case 'transmission': {
        if (v === '' || v === null || v === undefined) {
          errors.push(`linha ${index + 2}: campo obrigatório '${rawHeader}' vazio`);
        } else {
          if (field === 'state') v = normalizeState(String(v));
          else if (field === 'fuel') v = normalizeFuel(String(v));
          else if (field === 'transmission') v = normalizeTransmission(String(v));
          out[field] = v;
        }
        break;
      }
      case 'image':
      case 'description':
      case 'external_id':
      case 'plate_end':
      case 'video_url': {
        if (v === '' || v === null || v === undefined) out[field] = null;
        else out[field] = v;
        break;
      }
      case 'condition': {
        const s = String(v).toLowerCase();
        if (s === 'novo' || s === 'new' || s === '0') out[field] = 'new';
        else if (s === 'usado' || s === 'used' || s === 'seminovo') out[field] = 'used';
        else errors.push(`linha ${index + 2}: condição inválida ("${value}")`);
        break;
      }
      case 'color': {
        out.color = v === '' || v === null || v === undefined ? null : v;
        break;
      }
      case 'quantity': {
        const n = Number(v);
        if (!Number.isNaN(n) && n > 0) out.quantity = n;
        break;
      }
      default:
        break;
    }
  }

  // monta colors a partir de cor/quantidade
  if (out.color && out.color !== null) {
    out.colors = [{ name: String(out.color), quantity: out.quantity && Number(out.quantity) > 0 ? Number(out.quantity) : 1 }];
  }
  if (!out.colors) out.colors = [];

  return { vehicle: out, errors };
}

export function parseUploadedFile(
  buffer: Buffer,
  filename: string
): { rows: Record<string, unknown>[]; errors: string[] } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const lower = filename.toLowerCase();

  if (ext === 'json' || lower.endsWith('.json')) {
    try {
      const data = JSON.parse(buffer.toString('utf-8'));
      const arr = Array.isArray(data) ? data : data.vehicles;
      if (!Array.isArray(arr)) {
        return { rows: [], errors: ['JSON deve ser um array de veículos ou ter campo "vehicles"'] };
      }
      return { rows: arr.map((v) => (v && typeof v === 'object' ? v : {})), errors: [] };
    } catch {
      return { rows: [], errors: ['Não foi possível ler o arquivo JSON'] };
    }
  }

  // CSV/XLSX via SheetJS
  try {
    const isCsv = ext === 'csv' || lower.endsWith('.csv');
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      codepage: isCsv ? 65001 : undefined,
    });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return { rows: [], errors: ['Arquivo sem planilhas'] };
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: '',
    });
    return { rows, errors: [] };
  } catch {
    return { rows: [], errors: ['Não foi possível ler a planilha'] };
  }
}

export function normalizeState(s: string): string {
  return s.trim().toUpperCase();
}

function stripAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeFuel(s: string): string {
  const map: Record<string, string> = {
    flex: 'FLEX',
    gasolina: 'GASOLINA',
    etanol: 'ETANOL',
    alcool: 'ETANOL',
    diesel: 'DIESEL',
    eletrico: 'ELETRICO',
    hibrido: 'HIBRIDO',
  };
  return map[stripAccents(s)] ?? stripAccents(s).toUpperCase();
}

export function normalizeTransmission(s: string): string {
  const map: Record<string, string> = {
    manual: 'MANUAL',
    automatico: 'AUTOMATIC',
    automatica: 'AUTOMATIC',
    automatic: 'AUTOMATIC',
    automatizado: 'AUTOMATIZADO',
  };
  return map[stripAccents(s)] ?? stripAccents(s).toUpperCase();
}