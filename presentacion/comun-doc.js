/* Helpers compartidos por los manuales de ALIMETRIK */
const D = require("docx");
const NAVY="17212B", MINT="0CA678", MINTBG="E6F7F1", CODEBG="F1F4F6";
const GRIS="444444", MUTED="6B7A88", CORAL="C0392B", AMBERBG="FDF3DC", AMBER="D4A017";
const PT = n => n * 2;
const R = (t,o={}) => new D.TextRun({text:t, font:o.font||"Calibri", size:PT(o.size||11),
  bold:!!o.bold, italics:!!o.it, color:o.color||GRIS});
const H1 = (num,text) => new D.Paragraph({heading:D.HeadingLevel.HEADING_1,
  spacing:{before:380,after:160}, pageBreakBefore:true, children:[
    new D.TextRun({text:num+"  ",font:"Calibri",size:PT(19),bold:true,color:MINT}),
    new D.TextRun({text,font:"Calibri",size:PT(19),bold:true,color:NAVY})]});
const H2 = text => new D.Paragraph({heading:D.HeadingLevel.HEADING_2, spacing:{before:260,after:120},
  children:[new D.TextRun({text,font:"Calibri",size:PT(14),bold:true,color:MINT})]});
const BODY = (runs,o={}) => new D.Paragraph({
  children:(Array.isArray(runs)?runs:[[runs,{}]]).map(([t,ro])=>R(t,{size:11,...ro})),
  spacing:{after:o.after??140, line:288}});
const BUL = items => items.map(it => new D.Paragraph({
  children:(Array.isArray(it)?it:[[it,{}]]).map(([t,ro])=>R(t,{size:11,...ro})),
  numbering:{reference:"vinetas",level:0}, spacing:{after:90,line:276}}));
let _instNum = 0;   /* cada lista numerada es una instancia nueva: así reinicia en 1 */
const NUM = items => { const inst = ++_instNum; return items.map(it => new D.Paragraph({
  children:(Array.isArray(it)?it:[[it,{}]]).map(([t,ro])=>R(t,{size:11,...ro})),
  numbering:{reference:"pasos",level:0,instance:inst}, spacing:{after:110,line:276}})); };
function CODE(titulo, code){
  const out=[];
  if(titulo) out.push(new D.Paragraph({spacing:{before:140,after:40},
    children:[new D.TextRun({text:"▸ "+titulo,font:"Calibri",size:PT(9.5),bold:true,color:MINT})]}));
  const lines=code.split("\n");
  lines.forEach((l,i)=>out.push(new D.Paragraph({
    shading:{type:D.ShadingType.CLEAR, fill:CODEBG},
    spacing:{after:0,before:0,line:220}, indent:{left:200,right:200},
    border: i===0?{top:{style:D.BorderStyle.SINGLE,size:4,color:"D5DDE3"}}:
           (i===lines.length-1?{bottom:{style:D.BorderStyle.SINGLE,size:4,color:"D5DDE3"}}:undefined),
    children:[new D.TextRun({text:l.length?l:" ",font:"Courier New",size:PT(8),color:"1A2733"})]})));
  out.push(new D.Paragraph({children:[],spacing:{after:100}}));
  return out;
}
function CALLOUT(titulo,texto,fill=MINTBG,borde=MINT){
  return new D.Table({columnWidths:[9360], width:{size:9360,type:D.WidthType.DXA},
    borders:{top:{style:D.BorderStyle.SINGLE,size:6,color:borde},bottom:{style:D.BorderStyle.SINGLE,size:6,color:borde},
      left:{style:D.BorderStyle.SINGLE,size:6,color:borde},right:{style:D.BorderStyle.SINGLE,size:6,color:borde},
      insideHorizontal:{style:D.BorderStyle.NONE},insideVertical:{style:D.BorderStyle.NONE}},
    rows:[new D.TableRow({cantSplit:true,children:[new D.TableCell({
      width:{size:9360,type:D.WidthType.DXA}, shading:{type:D.ShadingType.CLEAR,fill},
      margins:{top:140,bottom:140,left:200,right:200},
      children:[new D.Paragraph({spacing:{after:60},children:[new D.TextRun({text:titulo,font:"Calibri",size:PT(10.5),bold:true,color:NAVY})]}),
        new D.Paragraph({spacing:{after:0,line:276},children:(Array.isArray(texto)?texto:[[texto,{}]]).map(([t,ro])=>R(t,{size:10.5,...ro}))})]})]})]});
}
function TABLA(headers,rows,widths){
  const total=widths.reduce((a,b)=>a+b,0);
  const cel=(txt,w,head,i)=>new D.TableCell({width:{size:w,type:D.WidthType.DXA},
    shading:{type:D.ShadingType.CLEAR, fill: head?NAVY:(i%2?"F5F8FA":"FFFFFF")},
    margins:{top:90,bottom:90,left:130,right:130},
    children:[new D.Paragraph({spacing:{after:0,line:252},
      children:(Array.isArray(txt)?txt:[[String(txt),{}]]).map(([t,ro])=>R(t,{size:9.5,bold:head||ro.bold,
        color: head?"FFFFFF":(ro.color||GRIS), font:ro.font}))})]});
  return new D.Table({columnWidths:widths, width:{size:total,type:D.WidthType.DXA},
    borders:{top:{style:D.BorderStyle.SINGLE,size:4,color:"C8D2DA"},bottom:{style:D.BorderStyle.SINGLE,size:4,color:"C8D2DA"},
      left:{style:D.BorderStyle.SINGLE,size:4,color:"C8D2DA"},right:{style:D.BorderStyle.SINGLE,size:4,color:"C8D2DA"},
      insideHorizontal:{style:D.BorderStyle.SINGLE,size:4,color:"DDE5EB"},insideVertical:{style:D.BorderStyle.SINGLE,size:4,color:"DDE5EB"}},
    rows:[new D.TableRow({tableHeader:true,children:headers.map((h,i)=>cel(h,widths[i],true,0))}),
      ...rows.map((r,ri)=>new D.TableRow({children:r.map((c,i)=>cel(c,widths[i],false,ri))}))]});
}
const SEP = () => new D.Paragraph({children:[],spacing:{after:120}});
function portada(kids, fs, titulo, subtitulo, descripcion, version="Versión 2.0 · Agosto de 2026"){
  kids.push(new D.Paragraph({children:[],spacing:{after:1100}}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:0},
    children:[new D.ImageRun({type:"png",data:fs.readFileSync("/tmp/huella-doc.png"),
      transformation:{width:150,height:200}})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{before:280,after:60},
    children:[new D.TextRun({text:"ALIMETRIK",font:"Calibri",size:PT(38),bold:true,color:NAVY})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:130},
    children:[new D.TextRun({text:"Sistema de comedor escolar con huella dactilar",
      font:"Calibri",size:PT(13),color:MUTED})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:70},
    children:[new D.TextRun({text:titulo,font:"Calibri",size:PT(26),bold:true,color:MINT})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:600},
    children:[new D.TextRun({text:subtitulo,font:"Calibri",size:PT(12.5),italics:true,color:MUTED})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,spacing:{after:50},
    children:[new D.TextRun({text:descripcion,font:"Calibri",size:PT(10.5),color:GRIS})]}));
  kids.push(new D.Paragraph({alignment:D.AlignmentType.CENTER,
    children:[new D.TextRun({text:version,font:"Calibri",size:PT(10.5),color:MUTED})]}));
}
function documento(kids, pie){
  return new D.Document({
    numbering:{config:[
      {reference:"vinetas",levels:[{level:0,format:D.LevelFormat.BULLET,text:"•",
        alignment:D.AlignmentType.LEFT,style:{paragraph:{indent:{left:460,hanging:230}}}}]},
      {reference:"pasos",levels:[{level:0,format:D.LevelFormat.DECIMAL,text:"%1.",
        alignment:D.AlignmentType.LEFT,style:{paragraph:{indent:{left:460,hanging:260}}}}]}]},
    styles:{default:{document:{run:{font:"Calibri",size:PT(11),color:GRIS}}}},
    sections:[{properties:{page:{size:{width:12240,height:15840},
        margin:{top:1200,bottom:1200,left:1440,right:1440}}},
      footers:{default:new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[
        new D.TextRun({text:pie+"   ·   pág. ",font:"Calibri",size:PT(8.5),color:MUTED}),
        new D.TextRun({children:[D.PageNumber.CURRENT],font:"Calibri",size:PT(8.5),color:MUTED})]})]})},
      children:kids}]});
}
module.exports = {D,NAVY,MINT,MINTBG,CODEBG,GRIS,MUTED,CORAL,AMBERBG,AMBER,PT,R,H1,H2,BODY,BUL,NUM,
  CODE,CALLOUT,TABLA,SEP,portada,documento};
