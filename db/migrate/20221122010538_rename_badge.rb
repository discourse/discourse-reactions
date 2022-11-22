# frozen_string_literal: true

class RenameBadge < ActiveRecord::Migration[6.1]
  TRANSLATIONS = {
    "ar" => "أول تفاعل",
    "de" => "Erste Reaktion",
    "es" => "Primera reacción",
    "fa_IR" => "اولین واکنش",
    "fi" => "Ensimmäinen reaktio",
    "fr" => "Première réaction",
    "he" => "תחושה ראשונה",
    "hu" => "Első reakció",
    "it" => "Prima reazione",
    "ja" => "最初のリアクション",
    "pl_PL" => "Pierwsza reakcja",
    "pt" => "Primeira Reação",
    "pt_BR" => "Primeira Reação",
    "ru" => "Первая реакция",
    "sv" => "Första reaktionen",
    "zh_CN" => "首次回应",
    "zh_TW" => "頭一個反應"
  }

  def up
    default_locale = DB.query_single("SELECT value FROM site_settings WHERE name = 'default_locale'").first || "en"

    sql = <<~SQL
      UPDATE badges
      SET name             = :new_name,
          description      = NULL,
          long_description = NULL
      WHERE name = :old_name
    SQL

    badge_name = TRANSLATIONS.fetch(default_locale, "First Reaction")
    DB.exec(sql, old_name: badge_name, new_name: "First Reaction")
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
