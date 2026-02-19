import { GoogleGenAI } from "@google/genai";
import { Budget, Lead } from "../types";

export const generateProposalText = async (lead: Lead, budget: Budget): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found");
    return "API Key is missing. Please configure the environment variable.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use primary contact (first one)
  const contact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : { nome: 'Responsável', cargo: 'Gestor' };

  const prompt = `
    Atue como um Especialista em Vendas de uma produtora audiovisual chamada "Arreda Produções".
    Escreva um texto de apresentação comercial (email ou introdução de proposta) persuasivo e profissional.
    
    Dados do Cliente:
    - Empresa: ${lead.empresa_nome} (${lead.nome_fantasia})
    - Contato Principal: ${contact.nome}, ${contact.cargo}
    
    Dados do Projeto:
    - Título: ${budget.titulo_projeto}
    - Valor Total: R$ ${budget.valor_final_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    - Descrição dos Itens: ${budget.items.map(i => i.descricao).join(', ')}
    
    O texto deve ser cordial, focado em valor, e convidar para uma reunião de alinhamento. Mantenha o tom criativo mas executivo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar o texto.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao comunicar com a IA. Tente novamente mais tarde.";
  }
};