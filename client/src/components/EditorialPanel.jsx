import styled from "styled-components";
import theme from "../theme";
import ceremonieImg from "../assets/ceremonie-cafe-maison-buna-ethiopie.png";

const Panel = styled.aside`
  background: ${theme.white};
  border-left: 1px solid ${theme.line};
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  padding: 40px 20px 36px;
  display: flex;
  flex-direction: column;

  @media (max-width: 1280px) {
    display: none;
  }
`;

const Quote = styled.blockquote`
  font-family: "Crimson Pro", Georgia, serif;
  font-weight: 300;
  font-style: italic;
  font-size: 22px;
  line-height: 1.35;
  color: ${theme.dark};
  letter-spacing: -0.2px;
  margin: 0 0 5px;

  em {
    font-style: normal;
    color: ${theme.accent};
  }
`;

const Pronunciation = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: ${theme.sandText};
  font-style: italic;
  margin: 0 0 28px;
`;

const Divider = styled.div`
  width: 32px;
  height: 1px;
  background: ${theme.line};
  margin-bottom: 28px;
`;

const Facts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
`;

const Fact = styled.div``;

const FactLabel = styled.div`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: ${theme.sandText};
  margin-bottom: 4px;
`;

const FactText = styled.div`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${theme.sandDark};
`;

const PhotoDecor = styled.div`
  margin-top: auto;
  overflow: hidden;
  border-radius: 8px;
  flex-shrink: 0;
`;

const PhotoDecorImg = styled.img`
  width: 100%;
  display: block;
  border-radius: 8px;
`;

const PhotoCaption = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 10px;
  font-style: italic;
  color: ${theme.sandText};
  margin-top: 8px;
  text-align: center;
`;

export default function EditorialPanel() {
  return (
    <Panel aria-hidden="true">
      <Quote>
        <em>Buna</em>
        {" — le mot amharique pour « café »."}
      </Quote>
      <Pronunciation>
        se prononce « <span style={{ color: theme.accent }}>bouna</span>
        {" »"}
      </Pronunciation>

      <Divider />

      <Facts>
        <Fact>
          <FactLabel>Grade 1 Arabica</FactLabel>
          <FactText>
            L'excellence du café éthiopien, reconnue à l'international.
          </FactText>
        </Fact>
        <Fact>
          <FactLabel>Traçabilité</FactLabel>
          <FactText>
            Sourcé via Heleph Coffee, partenaire éthiopien direct.
          </FactText>
        </Fact>
        <Fact>
          <FactLabel>Torréfaction</FactLabel>
          <FactText>
            Torréfié à la commande en France, pour préserver chaque arôme.
          </FactText>
        </Fact>
      </Facts>

      <PhotoDecor>
        <PhotoDecorImg src={ceremonieImg} alt="Cérémonie du café en Éthiopie" />
        <PhotoCaption>Cérémonie du café éthiopien</PhotoCaption>
      </PhotoDecor>
    </Panel>
  );
}
