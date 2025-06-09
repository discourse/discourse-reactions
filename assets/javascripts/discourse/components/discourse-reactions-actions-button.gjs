import { hash } from "@ember/helper";
import MountWidget from "discourse/components/mount-widget";
import Actions from "./discourse-reactions/actions";

const ReactionsActionButton = <template>
  <Actions @post={{@post}} />

  {{! template-lint-disable no-capital-arguments }}
  <MountWidget
    class="discourse-reactions-actions-button-shim"
    @widget="discourse-reactions-actions"
    @args={{hash post=@post showLogin=@buttonActions.showLogin}}
  />
</template>;

export default ReactionsActionButton;
