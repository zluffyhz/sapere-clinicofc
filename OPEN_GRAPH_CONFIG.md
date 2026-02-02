# Configuração Open Graph - Sapere Clinic

## O que foi configurado?

As **Meta Tags Open Graph** foram adicionadas ao `client/index.html` para controlar como o link do Web App aparece quando compartilhado em redes sociais (WhatsApp, Facebook, Twitter, LinkedIn, etc).

## Problema Resolvido

**Antes:** Ao compartilhar o link do Web App no WhatsApp, aparecia uma captura de tela do dashboard com informações sensíveis dos pacientes.

**Depois:** Agora aparece sempre o logo da Sapere com título e descrição profissionais, independente de qual página estiver aberta.

## Meta Tags Implementadas

### Open Graph (Facebook, WhatsApp, LinkedIn)
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Sapere Clinic - Portal de Gestão de Terapias" />
<meta property="og:description" content="Portal da Família e Terapeutas - Acompanhe a jornada terapêutica com transparência e motivação" />
<meta property="og:image" content="/og-image.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Logo Sapere Clinic" />
```

### Twitter Card
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sapere Clinic - Portal de Gestão de Terapias" />
<meta name="twitter:description" content="Portal da Família e Terapeutas - Acompanhe a jornada terapêutica com transparência e motivação" />
<meta name="twitter:image" content="/og-image.webp" />
```

### SEO Description
```html
<meta name="description" content="Portal da Família e Terapeutas da Clínica Sapere. Acompanhe agenda, frequência, documentos e evolução terapêutica com transparência e motivação." />
```

## Imagem Utilizada

**Arquivo:** `/client/public/og-image.webp`
- Cópia do logo Sapere atual
- Formato: WebP (otimizado para web)
- Localização: Pasta public (acessível via URL `/og-image.webp`)

## Como Testar

### Método 1: Validador Open Graph (Recomendado)

1. Acesse: https://www.opengraph.xyz/
2. Cole a URL do seu Web App
3. Clique em "Preview"
4. Você verá como o link aparecerá no WhatsApp, Facebook, etc.

### Método 2: Validador do Facebook

1. Acesse: https://developers.facebook.com/tools/debug/
2. Cole a URL do seu Web App
3. Clique em "Debug"
4. Veja a prévia e informações das meta tags

### Método 3: WhatsApp (Teste Real)

1. Copie a URL do Web App
2. Abra o WhatsApp Web ou App
3. Cole o link em uma conversa (pode ser "Mensagens Arquivadas" para testar sem enviar)
4. Aguarde alguns segundos para o WhatsApp carregar a prévia
5. Você verá o logo Sapere, título e descrição

**Importante:** O WhatsApp faz cache das prévias. Se você já compartilhou o link antes, pode demorar algumas horas para atualizar. Use os validadores online para teste imediato.

## Melhorias Futuras (Opcional)

### 1. Criar Imagem Open Graph Personalizada

Atualmente estamos usando o logo simples. Você pode criar uma imagem mais elaborada:

**Dimensões ideais:** 1200x630 pixels (proporção 1.91:1)

**Sugestão de design:**
- Fundo com gradiente laranja/amarelo (cores Sapere)
- Logo Sapere centralizado
- Texto: "Portal da Família Sapere"
- Subtexto: "Acompanhe a jornada terapêutica"

**Ferramentas para criar:**
- Canva: https://www.canva.com/ (template "Facebook Post")
- Figma: https://www.figma.com/
- Photoshop, GIMP, etc.

**Como substituir:**
1. Crie a imagem 1200x630px
2. Salve como `og-image.png` ou `og-image.jpg`
3. Substitua o arquivo em `/client/public/og-image.webp`
4. Atualize a meta tag no `index.html` se mudar a extensão

### 2. Adicionar og:url Dinâmica

Para sites com múltiplas páginas, você pode adicionar:
```html
<meta property="og:url" content="URL_COMPLETA_DO_SITE" />
```

### 3. Adicionar Favicon

Adicione um favicon para aparecer na aba do navegador:
```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

## Referências

- **Open Graph Protocol:** https://ogp.me/
- **Twitter Cards:** https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
- **WhatsApp Link Preview:** https://faq.whatsapp.com/general/how-to-preview-links

## Troubleshooting

### Preview não atualiza no WhatsApp

**Causa:** WhatsApp faz cache agressivo das prévias de link.

**Solução:**
1. Use validadores online para confirmar que as meta tags estão corretas
2. Aguarde algumas horas (cache expira)
3. Adicione um parâmetro na URL para forçar nova prévia: `?v=2`

### Imagem não aparece

**Possíveis causas:**
1. Caminho da imagem incorreto (deve ser absoluto: `/og-image.webp`)
2. Arquivo não existe em `/client/public/`
3. Formato de imagem não suportado (use PNG, JPG ou WebP)

**Solução:**
1. Verifique se arquivo existe: `ls client/public/og-image.webp`
2. Teste a URL diretamente no navegador: `SEU_DOMINIO/og-image.webp`
3. Use validadores para ver mensagens de erro

### Preview mostra conteúdo antigo

**Causa:** Cache do servidor ou da rede social.

**Solução:**
1. Limpe cache do validador (botão "Scrape Again" no Facebook Debugger)
2. Faça hard refresh no navegador (Ctrl+Shift+R)
3. Aguarde propagação do cache (pode levar horas)

## Status Atual

✅ Meta tags Open Graph configuradas
✅ Meta tags Twitter Card configuradas  
✅ Meta description para SEO configurada
✅ Imagem og-image.webp criada
✅ Servidor rodando com novas configurações
⏳ Aguardando teste de compartilhamento real no WhatsApp

## Próximos Passos

1. Testar compartilhamento em validadores online
2. Testar compartilhamento real no WhatsApp
3. (Opcional) Criar imagem Open Graph personalizada 1200x630px
4. (Opcional) Adicionar favicon ao site
