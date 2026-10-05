# Batalha Química 🧪⚛️

Site de estudo em formato de jogo para revisar:
- os 118 elementos químicos e seus símbolos;
- símbolo → nome do elemento;
- nome → símbolo;
- conceitos de átomo e tabela periódica.

## Rodar no computador

Requer Node.js 20 ou superior.

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Jogar online com muitas pessoas

O projeto usa Node.js + Express + Socket.IO. O servidor mantém as salas e sincroniza perguntas, respostas e placar em tempo real.

Para publicar, envie esta pasta para um repositório Git e crie um **Web Service** no Render. Use:

- Build Command: `npm install`
- Start Command: `npm start`

O servidor já escuta em `0.0.0.0` e usa a porta fornecida pela variável `PORT`.

Observação: as salas e placares ficam em memória. Reiniciar o servidor encerra as salas atuais; para histórico permanente seria necessário adicionar um banco de dados.
