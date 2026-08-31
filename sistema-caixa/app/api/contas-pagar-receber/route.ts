export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  listarContasPagarReceber, criarContaPagarReceber, darBaixaContaPagarReceber,
  editarContaPagarReceber, cancelarContaPagarReceber,
} from '@/lib/supabase-admin';

// Demanda 096 — "📋 Contas a Pagar/Receber", só Admin acessa. GET lista
// (com "atrasado" já calculado na leitura), POST cadastra, PATCH dá baixa
// (gera Saída/Entrada real e vincula o id, ver lib/supabase-admin.ts).
export async function GET() {
  try {
    const contas = await listarContasPagarReceber();
    return NextResponse.json({ contas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar contas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nome, valor, categoria, tipo, vencimento, recorrente, frequencia, operador } = await req.json();
    if (!nome || !valor || !categoria || !tipo || !vencimento || !operador) {
      return NextResponse.json({ error: 'nome, valor, categoria, tipo, vencimento e operador são obrigatórios' }, { status: 400 });
    }
    if (tipo !== 'pagar' && tipo !== 'receber') {
      return NextResponse.json({ error: 'tipo precisa ser "pagar" ou "receber"' }, { status: 400 });
    }
    // Demanda 125: frequência semanal além de mensal. Sem frequência
    // informada, recorrente continua mensal (comportamento de antes).
    if (recorrente && frequencia !== undefined && frequencia !== 'semanal' && frequencia !== 'mensal') {
      return NextResponse.json({ error: 'frequencia precisa ser "semanal" ou "mensal"' }, { status: 400 });
    }
    const conta = await criarContaPagarReceber({
      nome, valor: Number(valor), categoria, tipo, vencimento, recorrente: !!recorrente,
      frequencia: recorrente ? (frequencia ?? 'mensal') : undefined,
      operador,
    });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cadastrar conta' }, { status: 500 });
  }
}

// Demanda 125 — editar conta pendente/atrasada (nome/valor/categoria/
// vencimento). PUT porque o PATCH desta rota já é a baixa (096) — mantê-los
// separados evita discriminador implícito no corpo. Conta já paga é
// bloqueada na lib (o valor dela já virou Saída/Entrada real).
export async function PUT(req: NextRequest) {
  try {
    const { id, nome, valor, categoria, vencimento } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    if (valor !== undefined && (!Number(valor) || Number(valor) <= 0)) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }
    if (vencimento !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      return NextResponse.json({ error: 'Vencimento inválido (use AAAA-MM-DD)' }, { status: 400 });
    }
    const conta = await editarContaPagarReceber(id, {
      nome, valor: valor !== undefined ? Number(valor) : undefined, categoria, vencimento,
    });
    return NextResponse.json({ conta });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao editar conta';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// Demanda 125 — cancelar conta pendente/atrasada (DELETE real, decisão
// documentada na lib). Conta já paga é bloqueada na lib.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    await cancelarContaPagarReceber(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao cancelar conta';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, operador, ignorarSaidaExistente, vincularSaidaId } = await req.json();
    if (!id || !operador) {
      return NextResponse.json({ error: 'id e operador são obrigatórios' }, { status: 400 });
    }
    // Demanda 166: sem flag, a baixa procura saída parecida antes de criar
    // outra — conflito volta como 409 pra UI perguntar (vincular à existente,
    // criar mesmo assim, ou desistir). Aviso, nunca bloqueio.
    const resultado = await darBaixaContaPagarReceber(id, operador, {
      ignorarSaidaExistente: ignorarSaidaExistente === true,
      vincularSaidaId: typeof vincularSaidaId === 'string' ? vincularSaidaId : undefined,
    });
    if ('conflito' in resultado) {
      return NextResponse.json({ saidasParecidas: resultado.conflito }, { status: 409 });
    }
    const { contaAtualizada, novaInstancia } = resultado;
    return NextResponse.json({ conta: contaAtualizada, novaInstancia });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao dar baixa na conta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
