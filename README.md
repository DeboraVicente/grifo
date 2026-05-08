# Grifo

Aplicativo de controle financeiro pessoal e colaborativo. Gerencie despesas, divida contas com amigos, organize sua poupança em caixinhas e acompanhe seus cartões de crédito — tudo em tempo real.

## Funcionalidades

### Despesas
- Cadastro com nome, categoria, valor, data de compra e vencimento
- Dois tipos: **Despesa** (padrão) e **Financiamento**
- Parcelamento em até 420x — campo visível apenas para Cartão de Crédito
- Registro de pagamentos por parcela
- Adiantamentos com amortização pelo prazo (financiamentos)
- 9 categorias: casa, pessoal, saúde, locomoção, beleza, alimentação, educação, lazer, outros
- Métodos de pagamento: crédito, débito, pix, dinheiro

### Cartões de Crédito
- Cadastro de cartões com nome, banco, bandeira e **limite**
- Seleção do cartão ao registrar despesas no crédito
- Registro de despesa **para um amigo**: cobra no seu cartão em nome de outra pessoa
  - Despesa fica pendente de aprovação do amigo
  - Amigo aceita ou recusa diretamente na tela de Despesas
  - Compromete o limite do cartão mesmo enquanto pendente

### Rateio de Despesas
- Divida despesas com amigos de forma **igualitária** ou **proporcional à renda**
- Preview visual da divisão antes de criar
- Amigos recebem convite e podem aceitar ou recusar
- Acompanhamento do valor devido por participante, inclusive parcelado

### Receitas
- Cadastro de receitas com nome, valor, data e categoria (salário, freelance, investimento, outros)
- Suporte a receitas recorrentes
- Integradas aos relatórios de fluxo de caixa e saldo livre

### Relatórios
| Relatório | Descrição |
|---|---|
| Fluxo Mensal | Entradas vs saídas mês a mês com balanço |
| Categorias | Gastos por categoria com gráfico de barras |
| Parcelamentos | Controle de todas as parcelas ativas e pagas |
| Rateios | Valores a receber de amigos e a pagar para outros |
| Cartões | Limite, comprometido e disponível por cartão; despesas pendentes de amigos |
| Previsão | Forecast de gastos com base no histórico |
| Saldo Livre | Quanto sobra após comprometimentos fixos |
| Evolução | Patrimônio e gastos ao longo do tempo |

### Caixinhas
- Poupanças organizadas por categoria (emergência, viagem, educação, saúde, reforma, eletrônicos, outros)
- Meta de valor com barra de progresso
- Depósitos e saques com histórico de movimentos

### Amizades
- Adicione amigos por e-mail
- Aceite ou recuse convites recebidos
- Amigos ficam disponíveis para rateios e despesas compartilhadas

### Conta
- Perfil com nome e e-mail
- Gerenciamento de amizades e solicitações pendentes
- Cadastro e exclusão de cartões de crédito com banco, bandeira e limite

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Backend | Firebase (Auth + Firestore + Hosting) |
| Gráficos | Recharts |
| Estilo | CSS-in-JS |
| Ícones | Lucide React |
| PWA | vite-plugin-pwa |

## Estrutura do Projeto

```
src/
├── components/
│   ├── caixinhas/       # CaixinhaCard, CaixinhaForm
│   ├── despesas/        # DespesaCard, DespesaForm, PagamentoForm
│   ├── relatorios/      # FluxoCaixaMensal, RelatorioCategoria, ControleParcelamentos,
│   │                    # ControleRateio, RelatorioCartoes, ForecastGastos,
│   │                    # QuantoPossoGastar, EvolucaoFinanceira, ReceitaForm
│   └── ui/              # Modal
├── hooks/
│   ├── useAuth.ts
│   ├── useAmizades.ts
│   ├── useCartoes.ts
│   ├── useCaixinhas.ts
│   ├── useDespesas.ts
│   ├── useRateio.ts
│   ├── useReceitas.ts
│   └── useRelatorios.ts
├── lib/
│   ├── AuthContext.tsx
│   └── firebase.ts
├── pages/
│   ├── AuthPage.tsx
│   ├── CaixinhasPage.tsx
│   ├── ContaPage.tsx
│   ├── DespesasPage.tsx
│   └── RelatoriosPage.tsx
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
