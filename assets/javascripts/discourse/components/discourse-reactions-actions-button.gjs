import { hash } from "@ember/helper";
import MountWidget from "discourse/components/mount-widget";

const ReactionsActionButton = <template>
  <MountWidget
    @widget="discourse-reactions-actions"
    @args={{hash post=@post}}
  />
</template>;

export default ReactionsActionButton;
