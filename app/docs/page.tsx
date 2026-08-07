import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { CodeBlock } from './code-block';
import { Section } from './section';

export const metadata = {
  title: 'Documentação da API | Estoque de Veículos',
};

const BASE = 'https://estoque.viralstudios.com.br';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-semibold">Documentação de Integração</div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Voltar ao site
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">API de Veículos</h1>
          <p className="text-muted-foreground mt-2">
            Use estas rotas para sincronizar seu estoque e consultar veículos
            programaticamente (ex: via n8n). Base URL:{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-sm">{BASE}</code>
          </p>
        </div>

        <Section title="Autenticação">
          <p className="text-sm text-muted-foreground">
            Todas as rotas de integração exigem a <strong>API key da loja</strong>,
            encontrada no painel (aba API Key). Envie de uma destas formas:
          </p>
          <CodeBlock language="bash" code={`# Opção 1 (recomendada)\nAuthorization: Bearer SUA_API_KEY\n\n# Opção 2\nx-api-key: SUA_API_KEY\n\n# Opção 3\n?api_key=SUA_API_KEY`} />
        </Section>

        <Section title="POST /api/v1/inventory/sync">
          <p className="text-sm text-muted-foreground">
            Envia o estoque completo da loja. Usa <code>external_id</code> como chave
            idempotente (upsert: cria novos, atualiza existentes). Se{' '}
            <em>todos</em> os veículos enviados tiverem <code>external_id</code>,
            qualquer veículo ativo da loja que não estiver na lista é desativado.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -X POST ${BASE}/api/v1/inventory/sync \\\n  -H "Authorization: Bearer SUA_CHAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "vehicles": [ { "external_id": "v-001", "brand": "Fiat", "model": "Argo 1.6", "year_manufacture": 2024, "year_model": 2024, "km": 12000, "price": 85000, "fuel": "FLEX", "transmission": "AUTOMATIC", "condition": "used", "city": "Rio de Janeiro", "state": "RJ", "colors": [{ "name": "Branca", "quantity": 1 }], "image": "https://..." } ] }'`}
          />
          <CodeBlock
            language="json"
            code={`{\n  "store_id": "uuid",\n  "store_name": "Minha Loja",\n  "summary": { "received": 4, "created": 3, "updated": 1, "deactivated": 0 },\n  "status": "success"\n}`}
          />
        </Section>

        <Section title="GET /api/v1/vehicles">
          <CardDescription className="text-sm text-muted-foreground">
            Consulta veículos ativos. Padrão <code>scope=own</code> (só da própria
            loja) ou <code>scope=all</code> para todas as lojas.
          </CardDescription>
          <CodeBlock
            language="bash"
            code={`curl "${BASE}/api/v1/vehicles?scope=own&limit=20&brand=fiat" \\\n  -H "Authorization: Bearer SUA_CHAVE"`}
          />
          <CodeBlock
            language="json"
            code={`{\n  "scope": "own",\n  "authenticated_store": { "id": "uuid", "name": "Minha Loja" },\n  "total": 42,\n  "limit": 20,\n  "offset": 0,\n  "count": 20,\n  "vehicles": [ { "id": "uuid", "store_name": "Minha Loja", "brand": "Fiat", "model": "Argo", "price": 85000, ... } ]\n}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Filtros: <code>store_id</code>, <code>store_name</code>,{' '}
            <code>brand</code>, <code>model</code>, <code>fuel</code>,{' '}
            <code>transmission</code>, <code>condition</code> (new|used),{' '}
            <code>city</code>, <code>state</code>, <code>price_min/max</code>,{' '}
            <code>year_min/max</code>, <code>km_min/max</code>, <code>q</code>.
            Paginação: <code>limit</code> (1&ndash;100), <code>offset</code>.{' '}
            Ordenação: <code>order_by</code> (price|km|year_model|created_at),{' '}
            <code>order_dir</code> (asc|desc).
          </p>
        </Section>

        <Section title="GET /api/v1/vehicles/:id">
          <CardDescription className="text-sm text-muted-foreground">
            Retorna um veículo específico pela ID (UUID).
          </CardDescription>
          <CodeBlock
            language="bash"
            code={`curl "${BASE}/api/v1/vehicles/<VEHICLE_ID>" \\\n  -H "Authorization: Bearer SUA_CHAVE"`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Retorna 404 se não encontrado ou desativado.
          </p>
        </Section>

        <Section title="POST /api/upload (mídia)">
          <CardDescription className="text-sm text-muted-foreground">
            Envia uma imagem/vídeo e devolve uma URL pública. Exige login no painel
            (sessão), não usa API key. Máximo 15MB:{' '}
            <code>jpg, png, webp, gif, mp4, webm</code>.
          </CardDescription>
          <CodeBlock
            language="bash"
            code={`curl -X POST "${BASE}/api/upload" \\\n  -F "file=@/caminho/foto.jpg"`}
          />
          <CodeBlock
            language="json"
            code={`{ "ok": true, "url": "${BASE}/uploads/<uuid>.jpg", "kind": "image" }`}
          />
        </Section>

        <Card>
          <CardHeader>
            <CardTitle>Campos do veículo</CardTitle>
            <CardDescription>
              Campos aceitos no corpo do <code>/api/v1/inventory/sync</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5">
              {[
                ['external_id', 'Chave da integração. Some upsert de veículos.'],
                ['brand, model', 'Marca e modelo (obrigatórios).'],
                ['year_manufacture, year_model', 'Anos fab e modelo (int 1900-2100).'],
                ['km', 'Quilometragem (int >= 0).'],
                ['price', 'Preço em reais (número > 0).'],
                ['fuel', 'FLEX, GASOLINA, ETANOL, DIESEL, ELETRICO, HIBRIDO.'],
                ['transmission', 'MANUAL, AUTOMATIC, AUTOMATIZADO.'],
                ['condition', 'new | used (padrão used).'],
                ['city, state', 'Cidade e UF (2 letras, ex: SP).'],
                ['image', 'URL da imagem principal (opcional).'],
                ['videoUrl, videoOrder', 'URL do vídeo e ordem (opcional).'],
                ['colors', 'Lista de { name, quantity }.'],
                ['description', 'Descrição (opcional).'],
                ['plate_end', 'Final da placa (opcional).'],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-3">
                  <code className="shrink-0 text-sm bg-muted rounded px-1.5">{k}</code>
                  <span className="text-muted-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de autenticação por rota</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>
                <code className="bg-muted rounded px-1.5">{BASE}/api/v1/inventory/sync</code>{' '}
                - API key
              </li>
              <li>
                <code className="bg-muted rounded px-1.5">{BASE}/api/v1/vehicles</code> - API key
              </li>
              <li>
                <code className="bg-muted rounded px-1.5">{BASE}/api/v1/vehicles/:id</code> - API key
              </li>
              <li>
                <code className="bg-muted rounded px-1.5">{BASE}/api/upload</code> - Sessão do painel
                (cookie)
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              <strong>Nota:</strong> a API key, quando usada em <code>scope=own</code>,
              garante acesso só aos veículos da própria loja. Com{' '}
              <code>scope=all</code>, a chave autentica e o filtro de loja é opcional.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}