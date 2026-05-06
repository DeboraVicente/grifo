# Grifo

Aplicativo de controle financeiro pessoal e colaborativo. Gerencie despesas, divida contas com amigos e organize sua poupança em caixinhas — tudo em tempo real.

## Funcionalidades

### Despesas
- Cadastro com nome, categoria, valor e método de pagamento
- Parcelamento em até 24x (crédito)
- Registro de pagamentos por parcela e adiantamentos
- Barra de progresso de pagamento
- 9 categorias: casa, pessoal, saúde, locomoção, beleza, alimentação, educação, lazer, outros
- Métodos: crédito, débito, pix, dinheiro

### Rateio de Despesas
- Divida despesas com amigos de forma igualitária ou proporcional à renda
- Preview visual da divisão antes de criar
- Amigos recebem convite e podem aceitar ou recusar
- Acompanhamento do valor devido por participante, inclusive parcelado

### Caixinhas
- Poupanças organizadas por categoria (emergência, viagem, educação, saúde, reforma, eletrônicos, outros)
- Meta de valor com barra de progresso
- Depósitos e saques com histórico de movimentos

### Amizades
- Adicione amigos por e-mail
- Aceite ou recuse convites recebidos
- Amigos ficam disponíveis para seleção em rateios

### Conta
- Perfil com nome e e-mail
- Gerenciamento de amizades e solicitações pendentes

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Backend | Firebase (Auth + Firestore + Hosting) |
| Estilo | CSS-in-JS + Tailwind CSS |
| Ícones | Lucide React |
| PWA | vite-plugin-pwa |

## Estrutura do Projeto

```
src/
├── components/
│   ├── caixinhas/     # CaixinhaCard, CaixinhaForm
│   ├── despesas/      # DespesaCard, DespesaForm, PagamentoForm
│   └── ui/            # Modal
├── hooks/
│   ├── useAuth.ts
│   ├── useDespesas.ts
│   ├── useCaixinhas.ts
│   ├── useAmizades.ts
│   └── useRateio.ts
├── lib/
│   ├── AuthContext.tsx
│   └── firebase.ts
├── pages/
│   ├── AuthPage.tsx
│   ├── DespesasPage.tsx
│   ├── CaixinhasPage.tsx
│   └── ContaPage.tsx
└── types/
    └── index.ts
```

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Copie `.env.example` para `.env` e preencha com suas credenciais do Firebase:

```bash
cp .env.example .env
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Deploy

```bash
npm run build
firebase deploy
```

## Roadmap

- [ ] Relatórios e gráficos de gastos
