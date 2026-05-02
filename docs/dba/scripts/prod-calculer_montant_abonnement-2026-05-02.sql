CREATE OR REPLACE FUNCTION public.calculer_montant_abonnement(p_type_abonnement character varying, p_date_debut date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_montant NUMERIC := 0;
    v_prix_jour CONSTANT NUMERIC := 100;
    v_reduction_annuelle CONSTANT NUMERIC := 10;
    v_nb_jours INT;
BEGIN
    IF p_type_abonnement = 'MENSUEL' THEN
        -- Calcul du nombre de jours dans le mois
        v_nb_jours := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', p_date_debut) + INTERVAL '1 MONTH - 1 DAY')::DATE);
        v_montant := v_prix_jour * v_nb_jours;
        
    ELSIF p_type_abonnement = 'ANNUEL' THEN
        -- Calcul pour 12 mois avec réduction de 10 francs par mois
        v_montant := 0;
        FOR i IN 0..11 LOOP
            v_nb_jours := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', p_date_debut + (i || ' MONTHS')::INTERVAL) + INTERVAL '1 MONTH - 1 DAY')::DATE);
            v_montant := v_montant + (v_prix_jour * v_nb_jours) - v_reduction_annuelle;
        END LOOP;
        
    ELSE
        RAISE EXCEPTION 'Type d''abonnement invalide. Utilisez MENSUEL ou ANNUEL';
    END IF;
    
    RETURN v_montant;
END;
$function$
