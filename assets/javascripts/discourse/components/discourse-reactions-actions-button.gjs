import { hash } from "@ember/helper";
import MountWidget from "discourse/components/mount-widget";

const ReactionsActionButton = <template>
  {{! template-lint-disable no-capital-arguments }}
  <MountWidget
    class="discourse-reactions-actions-button-shim"
    @widget="discourse-reactions-actions"
    @args={{hash post=@post showLogin=@buttonActions.showLogin}}
  />
</template>;

export default ReactionsActionButton;
