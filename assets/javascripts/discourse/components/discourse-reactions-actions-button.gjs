import DiscourseReactionsActions from "./discourse-reactions-actions";

const ReactionsActionButton = <template>
  {{! template-lint-disable no-capital-arguments }}
  <div class="discourse-reactions-actions-button-shim">
    <DiscourseReactionsActions
      @post={{@post}}
      @showLogin={{@buttonActions.showLogin}}
    />
  </div>
  {{!-- <MountWidget
    class="discourse-reactions-actions-button-shim"
    @widget="discourse-reactions-actions"
    @args={{hash post=@post showLogin=@buttonActions.showLogin}}
  /> --}}
</template>;

export default ReactionsActionButton;
