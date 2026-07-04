function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';

  var pageMap = {
    'dashboard':  'Dashboard',
    'lancamento': 'Lancamento',
    'categorias': 'Categorias'
  };

  var fileName = pageMap[page.toLowerCase()] || 'Dashboard';

  var html = HtmlService
    .createTemplateFromFile(fileName)
    .evaluate()
    .setTitle('💲Controle Financeiro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');

  return html;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Constantes ───────────────────────────────────────────────
var SHEET_LANC = 'Lançamentos';
var SHEET_CATS = 'Categorias';

var COL_CATS = { RECEITA: 1, DESPESA: 2, INVESTIMENTO: 3 };

var COR = {
  RECEITA:      { fundo: '#d4edda', texto: '#155724', borda: '#22c55e' },
  DESPESA:      { fundo: '#f8d7da', texto: '#721c24', borda: '#ef4444' },
  INVESTIMENTO: { fundo: '#d1e7ff', texto: '#0c3a6d', borda: '#3b82f6' }
};

var COR_NEGATIVO = { fundo: '#fff8e6', texto: '#7c4d00', borda: '#f59e0b' };

// ── onOpen ────────────────────────────────────────────────────
function onOpen() {
  inicializarPlanilha();
  SpreadsheetApp.getUi()
    .createMenu('💲Controle Financeiro')
    .addItem('📊 Abrir Aplicação', 'abrirDashboard')
    .addToUi();
}

// ════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO AUTOMÁTICA DAS ABAS
// ════════════════════════════════════════════════════════════

function inicializarPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  _garantirAbaLancamentos(ss);
  _garantirAbaCategorias(ss);
}

function _garantirAbaLancamentos(ss) {
  var sheet = ss.getSheetByName(SHEET_LANC);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_LANC, 0);

  var header = ['Data', 'Tipo', 'Categoria', 'Valor', 'Observação'];
  var hRange = sheet.getRange(1, 1, 1, header.length);
  hRange.setValues([header]);
  hRange.setFontWeight('bold');
  hRange.setFontSize(11);
  hRange.setFontColor('#ffffff');
  hRange.setBackground('#1e2330');
  hRange.setHorizontalAlignment('center');
  hRange.setVerticalAlignment('middle');
  hRange.setBorder(true, true, true, true, true, true,
    '#f59e0b', SpreadsheetApp.BorderStyle.SOLID);

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 250);
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  return sheet;
}

function _garantirAbaCategorias(ss) {
  var sheet = ss.getSheetByName(SHEET_CATS);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_CATS);

  var header = ['Receitas', 'Despesas', 'Investimentos'];
  var hRange = sheet.getRange(1, 1, 1, 3);
  hRange.setValues([header]);
  hRange.setFontWeight('bold');
  hRange.setFontSize(11);
  hRange.setFontColor('#ffffff');
  hRange.setBackground('#1e2330');
  hRange.setHorizontalAlignment('center');
  hRange.setVerticalAlignment('middle');
  hRange.setBorder(true, true, true, true, true, true,
    '#f59e0b', SpreadsheetApp.BorderStyle.SOLID);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 200);
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  return sheet;
}

// ════════════════════════════════════════════════════════════
//  MODAIS (compatibilidade com menu)
// ════════════════════════════════════════════════════════════

function abrirDashboard() {
  var html = HtmlService
    .createHtmlOutputFromFile('Dashboard')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Dashboard Financeiro');
}

// ════════════════════════════════════════════════════════════
//  LEITURA DE DADOS (Dashboard)
// ════════════════════════════════════════════════════════════

/** Linha em branco (ignora cabeçalho e linhas totalmente vazias). */
function _linhaLancamentoVazia(row) {
  for (var c = 0; c < row.length; c++) {
    var cell = row[c];
    if (cell === null || cell === undefined) continue;
    if (cell instanceof Date && !isNaN(cell)) return false;
    if (String(cell).trim() !== '') return false;
  }
  return true;
}

/** Observação: coluna detectada no cabeçalho ou coluna E (índice 4) padrão. */
function _lerObservacao(row, idxObs) {
  var col = idxObs >= 0 ? idxObs : 4;
  if (col >= row.length) col = row.length - 1;
  if (col < 0) return '';
  return String(row[col] || '').trim();
}

/**
 * Lê todas as linhas da aba Lançamentos na ordem da planilha (linha 2 = topo).
 * Inclui rowIndex (nº da linha na planilha), observacao, e não descarta linhas
 * só por valor em branco ou tipo não padronizado (usa fallback seguro).
 */
function getDados() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LANC);
  if (!sheet) return { erro: 'Aba "Lançamentos" não encontrada.' };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { linhas: [], total: 0, aba: SHEET_LANC };

  var header = data[0].map(function(h) {
    return String(h).toUpperCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  });

  var idx = {
    data:      findCol(header, ['DATA','DATE','DT','DIA']),
    tipo:      findCol(header, ['TIPO','TYPE']),
    categoria: findCol(header, ['CATEGORIA','CATEGORY','CAT','DESCRICAO','DESC']),
    valor:     findCol(header, ['VALOR','VALUE','AMOUNT','VL','PRECO']),
    obs:       findCol(header, ['OBSERVACAO','OBS','NOTA','NOTE'])
  };
  if (idx.data      < 0) idx.data      = 0;
  if (idx.tipo      < 0) idx.tipo      = 1;
  if (idx.categoria < 0) idx.categoria = 2;
  if (idx.valor     < 0) idx.valor     = 3;

  var tz   = Session.getScriptTimeZone();
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (_linhaLancamentoVazia(row)) continue;

    var sheetRow = i + 1;

    var rawTipo = String(row[idx.tipo] || '').trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var tipo = normalizarTipo(rawTipo);
    if (!tipo) tipo = 'DESPESA';

    var valor = parseBRL(String(row[idx.valor] || '').trim());
    if (isNaN(valor)) valor = 0;

    var observacao = _lerObservacao(row, idx.obs);

    var rawData = row[idx.data];
    var dataStr = '', dataISO = '', mesKey = '';

    if (rawData instanceof Date && !isNaN(rawData)) {
      dataStr = Utilities.formatDate(rawData, tz, 'dd/MM/yyyy');
      dataISO = Utilities.formatDate(rawData, tz, 'yyyy-MM-dd');
      mesKey  = Utilities.formatDate(rawData, tz, 'yyyy-MM');
    } else if (rawData !== null && rawData !== undefined && String(rawData).trim() !== '') {
      dataStr = String(rawData).trim();
      var mFull   = dataStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      var mMesAno = !mFull && dataStr.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
      if (mFull) {
        var d  = mFull[1].padStart(2, '0');
        var mo = mFull[2].padStart(2, '0');
        var y  = mFull[3].length === 2 ? '20' + mFull[3] : mFull[3];
        dataISO = y + '-' + mo + '-' + d;
        dataStr = d + '/' + mo + '/' + y;
        mesKey  = y + '-' + mo;
      } else if (mMesAno) {
        var mo2 = mMesAno[1].padStart(2, '0');
        var y2  = mMesAno[2].length === 2 ? '20' + mMesAno[2] : mMesAno[2];
        dataISO = y2 + '-' + mo2 + '-01';
        dataStr = mo2 + '/' + y2;
        mesKey  = y2 + '-' + mo2;
      }
    }

    rows.push({
      rowIndex:   sheetRow,
      data:       dataStr,
      dataISO:    dataISO,
      mesKey:     mesKey,
      tipo:       tipo,
      categoria:  String(row[idx.categoria] || 'Outros').trim() || 'Outros',
      valor:      valor,
      observacao: observacao
    });
  }

  return { linhas: rows, total: rows.length, aba: SHEET_LANC };
}

// ════════════════════════════════════════════════════════════
//  LEITURA DE CATEGORIAS
// ════════════════════════════════════════════════════════════

function getCategorias() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CATS);

  if (!sheet) {
    var legados = _lerCategoriasDosLancamentos();
    return {
      RECEITA:       legados.RECEITA,
      DESPESA:       legados.DESPESA,
      INVESTIMENTO:  legados.INVESTIMENTO,
      precisaMigrar: true,
      novas:         { RECEITA: [], DESPESA: [], INVESTIMENTO: [], total: 0 }
    };
  }

  var novas = _detectarCategoriasNovas(sheet);

  return {
    RECEITA:       _lerColunaCats(sheet, COL_CATS.RECEITA),
    DESPESA:       _lerColunaCats(sheet, COL_CATS.DESPESA),
    INVESTIMENTO:  _lerColunaCats(sheet, COL_CATS.INVESTIMENTO),
    precisaMigrar: false,
    novas:         novas
  };
}

// ════════════════════════════════════════════════════════════
//  GRAVAÇÃO DE CATEGORIAS (aba Categorias)
// ════════════════════════════════════════════════════════════

function salvarCategoriaGerenciada(params) {
  try {
    var tipo = (params.tipo || '').toUpperCase();
    var nome = String(params.nome || '').trim();
    if (!nome || !COL_CATS[tipo]) return { ok: false, erro: 'Parâmetros inválidos.' };

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_CATS) || _garantirAbaCategorias(ss);
    var col   = COL_CATS[tipo];

    var existentes = _lerColunaCats(sheet, col);
    if (existentes.some(function(c) { return c.toLowerCase() === nome.toLowerCase(); })) {
      return { ok: false, erro: 'Categoria já existe.' };
    }

    var proxLinha = _proximaLinhaVazia(sheet, col);
    var cell      = sheet.getRange(proxLinha, col);
    cell.setValue(nome);
    _formatarCelulaCategoria(cell, tipo);

    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

function excluirCategoriaGerenciada(params) {
  try {
    var tipo = (params.tipo || '').toUpperCase();
    var nome = String(params.nome || '').trim();
    if (!nome || !COL_CATS[tipo]) return { ok: false, erro: 'Parâmetros inválidos.' };

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_CATS);
    if (!sheet) return { ok: false, erro: 'Aba "Categorias" não encontrada.' };

    var col       = COL_CATS[tipo];
    var lista     = _lerColunaCats(sheet, col);
    var novaLista = [];
    var encontrou = false;

    lista.forEach(function(c) {
      if (c === nome && !encontrou) { encontrou = true; }
      else { novaLista.push(c); }
    });

    if (!encontrou) return { ok: false, erro: 'Categoria não encontrada.' };

    _regravarColunaCats(sheet, col, tipo, novaLista);
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

function renomearCategoriaGerenciada(params) {
  try {
    var tipo     = (params.tipo || '').toUpperCase();
    var nomeAnt  = String(params.nomeAntigo || '').trim();
    var nomeNovo = String(params.nomeNovo   || '').trim();
    if (!nomeAnt || !nomeNovo || !COL_CATS[tipo]) return { ok: false, erro: 'Parâmetros inválidos.' };

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_CATS);
    if (!sheet) return { ok: false, erro: 'Aba "Categorias" não encontrada.' };

    var col     = COL_CATS[tipo];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: false, erro: 'Categoria não encontrada.' };

    var existentes = _lerColunaCats(sheet, col);
    if (existentes.some(function(c) { return c.toLowerCase() === nomeNovo.toLowerCase() && c !== nomeAnt; })) {
      return { ok: false, erro: 'Já existe uma categoria com esse nome.' };
    }

    var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === nomeAnt) {
        var cell = sheet.getRange(i + 2, col);
        cell.setValue(nomeNovo);
        _formatarCelulaCategoria(cell, tipo);
        return { ok: true };
      }
    }

    return { ok: false, erro: 'Categoria "' + nomeAnt + '" não encontrada.' };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

function migrarParaAbaCategorias(dados) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_CATS) || _garantirAbaCategorias(ss);
    _regravarTodasColunasCats(sheet, dados);
    return { ok: true };
  } catch(e) {
    return { ok: false, erro: e.message };
  }
}

// ════════════════════════════════════════════════════════════
//  GRAVAÇÃO DE LANÇAMENTOS (aba Lançamentos)
// ════════════════════════════════════════════════════════════

function _garantirCategoria(tipo, nomeCategoria) {
  if (!tipo || !nomeCategoria) return;
  var col = COL_CATS[tipo];
  if (!col) return;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CATS) || _garantirAbaCategorias(ss);

  var existentes = _lerColunaCats(sheet, col);
  var jaExiste   = existentes.some(function(c) {
    return c.toLowerCase() === nomeCategoria.toLowerCase();
  });

  if (!jaExiste) {
    var proxLinha = _proximaLinhaVazia(sheet, col);
    var cell      = sheet.getRange(proxLinha, col);
    cell.setValue(nomeCategoria);
    _formatarCelulaCategoria(cell, tipo);
  }
}

/**
 * Garante várias categorias novas de um tipo em UMA leitura + UMA escrita
 * (em vez de uma leitura+escrita por categoria). Usado pela gravação em lote.
 */
function _garantirCategoriasLote(tipo, nomesCategoria) {
  var col = COL_CATS[tipo];
  if (!col || !nomesCategoria || !nomesCategoria.length) return;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CATS) || _garantirAbaCategorias(ss);

  var existentes  = _lerColunaCats(sheet, col);
  var existLower  = existentes.map(function(c) { return c.toLowerCase(); });

  var novas = [];
  var vistos = {};
  nomesCategoria.forEach(function(nome) {
    var chave = nome.toLowerCase();
    if (existLower.indexOf(chave) === -1 && !vistos[chave]) {
      vistos[chave] = true;
      novas.push(nome);
    }
  });

  if (!novas.length) return;

  var proxLinha = _proximaLinhaVazia(sheet, col);
  var range     = sheet.getRange(proxLinha, col, novas.length, 1);
  range.setValues(novas.map(function(n) { return [n]; }));

  var cor = COR[tipo];
  if (cor) {
    range.setBackground(cor.fundo);
    range.setFontColor(cor.texto);
    range.setHorizontalAlignment('center');
    range.setBorder(true, true, true, true, false, false,
      cor.borda, SpreadsheetApp.BorderStyle.SOLID_THIN);
  }
}

function salvarLancamento(obj) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LANC) || _garantirAbaLancamentos(ss);

  var tipo      = (obj.tipo || '').toUpperCase();
  var categoria = (obj.categoria || '').trim();

  _garantirCategoria(tipo, categoria);

  sheet.insertRowAfter(1);

  var dataVal;
  if (obj.data) {
    var partes = obj.data.split('/');
    if (partes.length === 3) {
      dataVal = new Date(+partes[2], +partes[1] - 1, +partes[0]);
    } else {
      dataVal = obj.data;
    }
  } else {
    dataVal = new Date();
  }

  var valorFinal = Number(obj.valor) || 0;

  var valores = [dataVal, tipo, categoria, valorFinal, obj.observacao || ''];
  sheet.getRange(2, 1, 1, 5).setValues([valores]);

  _formatarLinhaLancamento(sheet, 2, tipo, valorFinal < 0);

  return { ok: true, linha: 2 };
}

/**
 * ════════════════════════════════════════════════════════════
 *  GRAVAÇÃO EM LOTE — usada pela UI otimista do painel de Lançamento.
 *  Recebe um array de lançamentos (1 ou N parcelas) e grava tudo em
 *  UMA única leitura/escrita em massa, em vez de 1 round-trip por item.
 *  Isso reduz drasticamente o número de chamadas de API do Sheets
 *  (cerca de 8 chamadas fixas, independente de quantos itens existam).
 *
 *  params esperado por item: { data (dd/mm/aaaa), tipo, categoria, valor, observacao }
 *  Retorna: { ok, linhas, rowIndexInicial } — rowIndexInicial é a linha
 *  (na planilha) onde o PRIMEIRO item da lista ficou gravado, considerando
 *  que a ordem é invertida (o último item da lista fica no topo, replicando
 *  o comportamento anterior de "insertRowAfter(1)" a cada gravação).
 * ════════════════════════════════════════════════════════════
 */
function salvarLoteLancamentos(itens) {
  try {
    if (!itens || !itens.length) return { ok: false, erro: 'Lista de lançamentos vazia.' };

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_LANC) || _garantirAbaLancamentos(ss);
    var n     = itens.length;

    // 1) Agrupa categorias novas por tipo e garante todas de uma vez
    var porTipo = { RECEITA: {}, DESPESA: {}, INVESTIMENTO: {} };
    itens.forEach(function (it) {
      var tipo = (it.tipo || '').toUpperCase();
      var cat  = (it.categoria || '').trim();
      if (porTipo[tipo] && cat) porTipo[tipo][cat] = true;
    });
    Object.keys(porTipo).forEach(function (tipo) {
      var nomes = Object.keys(porTipo[tipo]);
      if (nomes.length) _garantirCategoriasLote(tipo, nomes);
    });

    // 2) Insere todas as linhas necessárias de uma só vez, no topo (após o cabeçalho)
    sheet.insertRowsAfter(1, n);

    // 3) Monta os valores. Mantemos a ordem invertida para reproduzir o
    //    comportamento visual anterior (o item mais recente da fila fica no topo).
    var valores = [];
    var bgs     = [];
    var fcs     = [];
    var linhasInseridas = [];

    for (var i = n - 1; i >= 0; i--) {
      var it = itens[i];
      var tipo = (it.tipo || '').toUpperCase();
      var categoria = (it.categoria || '').trim();
      var valorFinal = Number(it.valor) || 0;

      var dataVal;
      if (it.data) {
        var partes = String(it.data).split('/');
        if (partes.length === 3) dataVal = new Date(+partes[2], +partes[1] - 1, +partes[0]);
        else dataVal = it.data;
      } else {
        dataVal = new Date();
      }

      valores.push([dataVal, tipo, categoria, valorFinal, it.observacao || '']);

      var cor = (valorFinal < 0) ? COR_NEGATIVO : (COR[tipo] || { fundo: '#ffffff', texto: '#000000' });
      bgs.push([cor.fundo, cor.fundo, cor.fundo, cor.fundo, cor.fundo]);
      fcs.push([cor.texto, cor.texto, cor.texto, cor.texto, cor.texto]);

      linhasInseridas.push({ tempIdx: i, item: it });
    }

    var range = sheet.getRange(2, 1, n, 5);
    range.setValues(valores);
    range.setBackgrounds(bgs);
    range.setFontColors(fcs);
    range.setFontSize(11);
    range.setVerticalAlignment('middle');
    range.setHorizontalAlignment('center');
    range.setBorder(true, true, true, true, true, true,
      '#f59e0b', SpreadsheetApp.BorderStyle.SOLID_THIN);

    sheet.getRange(2, 1, n, 1).setNumberFormat('dd/mm/yyyy');
    sheet.getRange(2, 4, n, 1).setNumberFormat('R$ #,##0.00;[RED]-R$ #,##0.00');
    sheet.getRange(2, 5, n, 1).setHorizontalAlignment('left');
    sheet.setRowHeights(2, n, 30);

    return { ok: true, linhas: n, primeiraLinha: 2, ultimaLinha: n + 1 };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

function _formatarLinhaLancamento(sheet, linha, tipo, ehNegativo) {
  var cor = ehNegativo
    ? COR_NEGATIVO
    : (COR[tipo] || { fundo: '#ffffff', texto: '#000000', borda: '#cccccc' });

  var fullRow = sheet.getRange(linha, 1, 1, 5);
  fullRow.setBackground(cor.fundo);
  fullRow.setFontColor(cor.texto);
  fullRow.setFontSize(11);
  fullRow.setVerticalAlignment('middle');
  fullRow.setHorizontalAlignment('center');
  fullRow.setBorder(true, true, true, true, true, true,
    cor.borda, SpreadsheetApp.BorderStyle.SOLID_THIN);

  sheet.setRowHeight(linha, 30);
  sheet.getRange(linha, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(linha, 4).setNumberFormat('R$ #,##0.00;[RED]-R$ #,##0.00');
  sheet.getRange(linha, 5).setHorizontalAlignment('left');
}

// ════════════════════════════════════════════════════════════
//  HELPERS — Aba Categorias
// ════════════════════════════════════════════════════════════

function _lerColunaCats(sheet, col) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  var result = [];
  values.forEach(function(row) {
    var v = String(row[0]).trim();
    if (v) result.push(v);
  });
  return result.sort();
}

function _proximaLinhaVazia(sheet, col) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 2;
  var values = sheet.getRange(2, col, lastRow, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === '') return i + 2;
  }
  return lastRow + 1;
}

function _formatarCelulaCategoria(cell, tipo) {
  var cor = COR[tipo];
  if (!cor) return;
  cell.setBackground(cor.fundo);
  cell.setFontColor(cor.texto);
  cell.setFontWeight('normal');
  cell.setHorizontalAlignment('center');
  cell.setBorder(true, true, true, true, false, false,
    cor.borda, SpreadsheetApp.BorderStyle.SOLID_THIN);
}

function _regravarColunaCats(sheet, col, tipo, lista) {
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var clearRange = sheet.getRange(2, col, lastRow - 1, 1);
    clearRange.clearContent();
    clearRange.setBackground(null);
    clearRange.setFontColor(null);
    clearRange.setBorder(false, false, false, false, false, false);
  }
  if (!lista.length) return;
  lista.forEach(function(nome, i) {
    var cell = sheet.getRange(i + 2, col);
    cell.setValue(nome);
    _formatarCelulaCategoria(cell, tipo);
  });
}

function _regravarTodasColunasCats(sheet, dados) {
  var tipos = ['RECEITA', 'DESPESA', 'INVESTIMENTO'];
  tipos.forEach(function(tipo) {
    var lista = (dados[tipo] || []).slice().sort();
    _regravarColunaCats(sheet, COL_CATS[tipo], tipo, lista);
  });
}

function _lerCategoriasDosLancamentos() {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var lancSheet = ss.getSheetByName(SHEET_LANC);
  var resultado = { RECEITA: [], DESPESA: [], INVESTIMENTO: [] };

  if (!lancSheet) return resultado;

  var lastRow = lancSheet.getLastRow();
  if (lastRow < 2) return resultado;

  var data = lancSheet.getRange(2, 2, lastRow - 1, 2).getValues();
  var sets = { RECEITA: {}, DESPESA: {}, INVESTIMENTO: {} };

  data.forEach(function(row) {
    var tipo = String(row[0]).trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var cat  = String(row[1]).trim();

    var tipoNorm = null;
    if (tipo.indexOf('RECEITA') >= 0 || tipo.indexOf('INCOME') >= 0 || tipo.indexOf('ENTRADA') >= 0) tipoNorm = 'RECEITA';
    else if (tipo.indexOf('INVEST') >= 0) tipoNorm = 'INVESTIMENTO';
    else if (tipo.indexOf('DESPESA') >= 0 || tipo.indexOf('EXPENSE') >= 0) tipoNorm = 'DESPESA';

    if (tipoNorm && cat) sets[tipoNorm][cat] = true;
  });

  resultado.RECEITA      = Object.keys(sets.RECEITA).sort();
  resultado.DESPESA      = Object.keys(sets.DESPESA).sort();
  resultado.INVESTIMENTO = Object.keys(sets.INVESTIMENTO).sort();
  return resultado;
}

function _detectarCategoriasNovas(sheet) {
  var deLancamentos = _lerCategoriasDosLancamentos();
  var resultado     = { RECEITA: [], DESPESA: [], INVESTIMENTO: [], total: 0 };

  ['RECEITA', 'DESPESA', 'INVESTIMENTO'].forEach(function(tipo) {
    var existentes = _lerColunaCats(sheet, COL_CATS[tipo]);
    var existLower = existentes.map(function(c) { return c.toLowerCase(); });

    deLancamentos[tipo].forEach(function(cat) {
      if (existLower.indexOf(cat.toLowerCase()) === -1) {
        resultado[tipo].push(cat);
        resultado.total++;
      }
    });
  });

  return resultado;
}

// ════════════════════════════════════════════════════════════
//  HELPERS GERAIS
// ════════════════════════════════════════════════════════════

function findCol(h, opts) {
  for (var o = 0; o < opts.length; o++) {
    for (var i = 0; i < h.length; i++) {
      if (h[i] === opts[o] || h[i].indexOf(opts[o]) === 0) return i;
    }
  }
  return -1;
}

function normalizarTipo(s) {
  if (s.indexOf('RECEITA')  >= 0 || s.indexOf('INCOME')  >= 0 || s.indexOf('ENTRADA') >= 0) return 'RECEITA';
  if (s.indexOf('INVEST')   >= 0) return 'INVESTIMENTO';
  if (s.indexOf('DESPESA')  >= 0 || s.indexOf('EXPENSE') >= 0) return 'DESPESA';
  return null;
}

function parseBRL(s) {
  if (!s || s === '' || s === '-' || s === '−') return NaN;

  var neg = /^\s*[\-\−\(]/.test(s) || /\)\s*$/.test(s);

  var v = s
    .replace(/R\$\s*/gi, '')
    .replace(/[()]/g, '')
    .replace(/[\-\−]/g, '')
    .trim();

  if (v.indexOf(',') >= 0) {
    v = v.replace(/\./g, '').replace(',', '.');
  }

  var n = parseFloat(v);
  if (isNaN(n)) return NaN;

  return neg ? -n : n;
}

// ── Editar / excluir lançamento (histórico) — exige rowIndex válido da planilha

function editarLancamento(params) {
  try {
    var rowIndex = params.rowIndex;
    var dataStr = params.data;
    var tipo = String(params.tipo || '').toUpperCase().trim();
    var categoria = String(params.categoria || '').trim();
    var valor = Number(params.valor);
    var observacao = String(params.observacao || '');

    if (['RECEITA', 'DESPESA', 'INVESTIMENTO'].indexOf(tipo) === -1) {
      return { ok: false, erro: 'Tipo de lançamento inválido ou ausente ("' + tipo + '"). Edição cancelada para não corromper o registro.' };
    }

    if (!rowIndex || rowIndex < 2) return { ok: false, erro: 'Linha inválida.' };

    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LANC);
    if (!aba) return { ok: false, erro: 'Aba "Lançamentos" não encontrada.' };

    var lastRow = aba.getLastRow();
    if (rowIndex > lastRow) return { ok: false, erro: 'Linha fora da planilha.' };

    var dataVal = dataStr;
    if (dataStr && String(dataStr).indexOf('/') >= 0) {
      var partes = String(dataStr).split('/');
      if (partes.length === 3) {
        dataVal = new Date(+partes[2], +partes[1] - 1, +partes[0]);
      }
    }

    aba.getRange(rowIndex, 1, 1, 5).setValues([[dataVal, tipo, categoria, valor, observacao]]);
    _formatarLinhaLancamento(aba, rowIndex, tipo, valor < 0);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

function excluirLancamento(params) {
  try {
    var rowIndex = params.rowIndex;
    if (!rowIndex || rowIndex < 2) return { ok: false, erro: 'Linha inválida.' };

    var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LANC);
    if (!aba) return { ok: false, erro: 'Aba "Lançamentos" não encontrada.' };

    var lastRow = aba.getLastRow();
    if (rowIndex > lastRow) return { ok: false, erro: 'Linha fora da planilha.' };

    aba.deleteRow(rowIndex);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}